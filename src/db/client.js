import bcrypt from 'bcrypt'
import { OAuthClientName } from '../classes/Validators'

const CLIENT_SECRET_MAX_LENGTH = 1024

module.exports = function (sequelize, DataTypes) {
  let client = sequelize.define('Client', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      validate: {
        isUUID: 4
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: OAuthClientName
      }
    },
    secret: {
      type: DataTypes.STRING(CLIENT_SECRET_MAX_LENGTH),
      allowNull: false,
      validate: {
        min: 32,
        max: 512
      }
    },
    redirectUri: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true,
        notEmpty: true,
        max: 255
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      validate: {
        isUUID: 4
      }
    }
  })

  let hashPasswordHook = async function (instance) {
    if (!instance.changed('secret')) {
      return
    }
    let hash = await bcrypt.hash(instance.get('secret'), global.BCRYPT_ROUNDS_COUNT)
    instance.set('secret', hash)
  }
  client.beforeCreate(hashPasswordHook)
  client.beforeUpdate(hashPasswordHook)

  client.prototype.toJSON = function () {
    let values = this.get()
    delete values.secret
    return values
  }

  client.associate = function (models) {
    models.Client.belongsTo(models.User, { as: 'user' })

    models.Client.addScope('defaultScope', {
      include:  [
        {
          model: models.User,
          as: 'user',
          required: true
        }
      ]
    }, {
      override: true
    })
  }

  return client
}
