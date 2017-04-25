'use strict'

let Rescue = require('../db').Rescue
let User = require('../db').User
let Rat = require('../db').Rat
let Decals = require('../db').Decal

const originalDecalDeadline = '2016-04-01 00:00:00+00'
const currentDecalDeadline = '2016-05-01 00:00:00+00'
const rescueParticipationRequirement = 10

class Decal {
  static checkEligble (user) {
    return new Promise(function (resolve, reject) {
      Decals.findOne({
        where: {
          userId: user.id
        }
      }).then(function (decal) {
        if (decal) {
          return resolve(decal)
        }

        checkEligibleForOriginalDecal(user).then(function (previouslyEligible) {
          if (previouslyEligible && previouslyEligible.rats) {
            for (let rat of previouslyEligible.rats) {
              if (rat.firstLimpet.length > 0) {
                return reject()
              }
            }
          }

          checkEligibleForRescueDecal(user).then(function (eligible) {
            if (eligible && eligible.rats) {
              for (let rat of eligible.rats) {
                if (rat.firstLimpet.length >= rescueParticipationRequirement) {
                  return resolve(true)
                }
              }
            }
            reject()
          })
        })
      }).catch(function (error) {
        reject (error)
      })
    })
  }

  static getDecalForUser (user) {
    return new Promise(function (resolve, reject) {
      Decal.checkEligble(user).then(function (decal) {
        if (decal === true) {
          Decal.redeem(user, 'Rescues').then(function (decal) {
            if (!decal) {
              return reject()
            }
            resolve(decal)
          })
        } else {
          resolve(decal)
        }
      }).catch(function (error) {
        reject(error)
      })
    })
  }

  static redeem (user, type, notes = '') {
    return new Promise(function (resolve, reject) {
      Decals.findOne({
        where: {
          userId: null,
          type: 'Rescues'
        }
      }).then(function (availableDecal) {
        if (!availableDecal) {
          reject()
        }

        availableDecal.update({
          userId: user.id,
          notes: notes,
          claimedAt: Date.now()
        }).then(function (decal) {
          resolve(decal)
        })
      }).catch(function (error) {
        reject(error)
      })
    })
  }
}

function checkEligibleForOriginalDecal (user) {
  return User.findOne({
    where: {
      id: user.id
    },
    include: [{
      required: true,
      model: Rat,
      as: 'rats',
      include: [{
        required: true,
        where: {
          createdAt: {
            $lt: originalDecalDeadline
          },
          successful: true
        },
        limit: 1,
        model: Rescue,
        as: 'firstLimpet'
      }]
    }]
  })
}

function checkEligibleForRescueDecal (user) {
  return User.findOne({
    where: {
      id: user.id
    },
    include: [{
      required: true,
      model: Rat,
      as: 'rats',
      include: [{
        required: true,
        where: {
          createdAt: {
            $lt: currentDecalDeadline
          },
          successful: true
        },
        limit: rescueParticipationRequirement,
        model: Rescue,
        as: 'firstLimpet'
      }]
    }]
  })
}

module.exports = Decal