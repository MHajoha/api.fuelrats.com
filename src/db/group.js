import {IRCVirtualHost, OAuthScope } from '../classes/Validators'

module.exports = function (sequelize, DataTypes) {
  let group = sequelize.define('Group', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      validate: {
        isAlphanumeric: true,
        notEmpty: true
      }
    },
    vhost: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: IRCVirtualHost
      }
    },
    isAdministrator: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: true
      }
    },
    permissions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      validate: {
        OAuthScope
      }
    }
  }, {
    paranoid: true
  })

  group.associate = function (models) {
    models.Group.hasMany(models.UserGroups)

    models.Group.addScope('stats', {
      attributes: []
    })
  }

  return group
}
