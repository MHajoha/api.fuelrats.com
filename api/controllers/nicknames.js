'use strict'
let _ = require('underscore')
let Anope = require('../Anope')
let Permission = require('../permission')
let Errors = require('../errors')
let User = require('../db').User
let db = require('../db').db
let Rat = require('../db').Rat


class Controller {
  static info (data, connection, query) {
    return new Promise(function (resolve, reject) {
      if (!query.nickname || query.nickname.length === 0) {
        reject({ meta: {}, error: Errors.throw('missing_required_field', 'nickname') })
        return
      }

      Anope.info(query.nickname).then(function (info) {
        if (!info) {
          reject({ meta: {}, error: Errors.throw('not_found') })
          return
        }

        resolve({ meta: {}, data: anopeInfoToAPIResult(info, connection.user.group) })
      }).catch(function (error) {
        reject({ meta: {}, error: Errors.throw('server_error', error) })
      })
    })
  }

  static register (data, connection) {
    return new Promise(function (resolve, reject) {
      let fields = ['nickname', 'password']


      for (let field of fields) {
        if (!data[field]) {
          reject({ meta: {}, error: Errors.throw('missing_required_field', field) })
          return
        }
      }

      Anope.register(data.nickname, data.password, connection.user.email).then(function () {
        let nicknames = connection.user.nicknames
        nicknames.push(data.nickname)

        Anope.confirm(data.nickname).then(function () {
          User.update({ nicknames: nicknames }, {
            where: { id: connection.user.id }
          }).then(function () {
            User.findOne({
              where: { id: connection.user.id },
              include: [
                {
                  model: Rat,
                  as: 'rats',
                  required: false
                }
              ]
            }).then(function (user) {
              Anope.setVirtualHost(user, data.nickname).then(function () {
                resolve({ meta: {}, data: data.nickname })
              }).catch(function (error) {
                reject({ meta: {}, error: Errors.throw('server_error', error) })
              })
            }).catch(function (error) {
              reject({ meta: {}, error: Errors.throw('server_error', error) })
            })
          }).catch(function (error) {
            reject({ meta: {}, error: Errors.throw('server_error', error) })
          })
        }).catch(function (error) {
          reject({ meta: {}, error: Errors.throw('server_error', error) })
        })
      }).catch(function (error) {
        reject({ meta: {}, error: Errors.throw('server_error', error) })
      })
    })
  }

  static connect (data, connection) {
    return new Promise(function (resolve, reject) {
      let fields = ['nickname', 'password']

      for (let field of fields) {
        if (!data[field]) {
          reject({ meta: {}, error: Errors.throw('missing_required_field', field) })
          return
        }
      }

      Anope.authenticate(data.nickname, data.password).then(function () {
        let nicknames = connection.user.nicknames
        nicknames.push(data.nickname)

        User.update({ nicknames: nicknames }, {
          where: { id: connection.user.id }
        }).then(function () {
          User.findOne({
            where: { id: connection.user.id },
            include: [
              {
                model: Rat,
                as: 'rats',
                required: false
              }
            ]
          }).then(function (user) {
            Anope.setVirtualHost(user, data.nickname).then(function () {
              resolve({ meta: {}, data: data.nickname })
            }).catch(function (error) {
              reject({ meta: {}, error: Errors.throw('server_error', error) })
            })
          }).catch(function (error) {
            reject({ meta: {}, error: Errors.throw('server_error', error) })
          })
        }).catch(function (error) {
          reject({ meta: {}, error: Errors.throw('server_error', error) })
        })
      }).catch(function () {
        reject({ meta: {}, error: Errors.throw('no_permission') })
      })
    })
  }

  static delete (data, connection, query) {
    return new Promise(function (resolve, reject) {
      if (!query.nickname) {
        reject({ meta: {}, error: Errors.throw('missing_required_field', 'nickname') })
      }

      if (connection.user.nicknames.includes(query.nickname) || connection.user.group === 'admin') {
        Anope.drop(query.nickname).then(function () {
          let nicknames = connection.user.nicknames
          nicknames.splice(nicknames.indexOf(query.nickname), 1)

          User.update({ nicknames: nicknames }, {
            where: {
              id: connection.user.id
            }
          }).then(function () {
            resolve()
          }).catch(function (error) {
            reject({ meta: {}, error: Errors.throw('server_error', error) })
          })
        }).catch(function (error) {
          reject({ meta: {}, error: Errors.throw('server_error', error) })
        })
      } else {
        reject({ meta: {}, error: Errors.throw('no_permission') })
      }
    })
  }

  static search (data, connection, query) {
    return new Promise(function (resolve, reject) {
      if (!query.nickname) {
        reject({ meta: {}, error: Errors.throw('missing_required_field', 'nickname') })
      }

      let strippedNickname = query.nickname.replace(/\[(.*?)\]$/g, '')

      let displayPrivateFields = connection.user && Permission.granted('user.read', connection.user)

      let limit = parseInt(query.limit) || 25
      let offset = parseInt(query.offset) || 0
      let order = parseInt(query.order) || 'createdAt'
      let direction = query.direction || 'ASC'

      let dbQuery = {
        where: {
          nicknames: {
            $overlap:  db.literal(`ARRAY[${db.escape(query.nickname)}, ${db.escape(strippedNickname)}]::citext[]`)
          }
        },
        include: [{
          model: Rat,
          as: 'rats',
          require: false
        }],
        limit: limit,
        offset: offset,
        order: [
          [order, direction]
        ]
      }

      User.findAndCountAll(dbQuery).then(function (result) {
        let meta = {
          count: result.rows.length,
          limit: dbQuery.limit,
          offset: dbQuery.offset,
          total: result.count
        }

        let users = result.rows.map(function (userInstance) {
          let user = userInstance.toJSON()

          if (!displayPrivateFields) {
            user.email = null
          }

          delete user.password
          delete user.salt
          delete user.dispatch
          delete user.deletedAt

          user.rats = user.rats.map(function (rat) {
            delete rat.UserId
            delete rat.deletedAt
            return rat
          })

          return user
        })

        resolve({
          data: users,
          meta: meta
        })
      }).catch(function (error) {
        reject({ meta: {}, error: Errors.throw('server_error', error) })
      })
    })
  }
}

class HTTP {
  static get (request, response, next) {
    response.model.meta.params = _.extend(response.model.meta.params, request.params)

    Controller.info(request.body, request, request.query).then(function (res) {
      let data = res.data

      response.model.data = data
      response.status = 200
      next()
    }, function (error) {
      response.model.errors.push(error.error)
      response.status(error.error.code)
      next()
    })
  }

  static post (request, response, next) {
    response.model.meta.params = _.extend(response.model.meta.params, request.params)

    Controller.register(request.body, request, request.query).then(function (res) {
      response.model.data = res.data
      response.status(201)
      next()
    }, function (error) {
      response.model.errors.push(error)
      response.status(500)
      next()
    })
  }

  static put (request, response, next) {
    response.model.meta.params = _.extend(response.model.meta.params, request.params)

    Controller.connect(request.body, request, request.query).then(function (data) {
      response.model.data = data.data
      response.status(201)
      next()
    }).catch(function (error) {
      response.model.errors.push(error)
      response.status(error.error.code)
      next()
    })
  }

  static delete (request, response, next) {
    response.model.meta.params = _.extend(response.model.meta.params, request.params)

    Controller.delete(request.body, request, request.query).then(function () {
      response.status(204)
      next()
    }).catch(function (error) {
      response.model.errors.push(error)
      response.status(error.error.code)
      next()
    })
  }

  static search (request, response, next) {
    response.model.meta.params = _.extend(response.model.meta.params, request.params)

    Controller.search(request.body, request, request.query).then(function (res) {
      response.model.data = res.data
      response.status(200)
      next()
    }).catch(function (error) {
      response.model.errors.push(error)
      response.status(error.error.code)
      next()
    })
  }
}


function anopeInfoToAPIResult (result, group) {
  if (group !== 'admin') {
    if (result.vhost) {
      result.hostmask = result.vhost
      delete result.vhost
    }
    delete result.email
  }
  return result
}

module.exports = { HTTP: HTTP, Controller: Controller }
