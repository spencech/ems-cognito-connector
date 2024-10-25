"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Authenticator = Authenticator;
var _amazonCognitoIdentityJs = require("amazon-cognito-identity-js");
var _axios = _interopRequireDefault(require("axios"));
var Decoded = _interopRequireWildcard(require("jwt-decode"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function Authenticator(UserPoolId, ClientId, IdToken, AccessToken, RefreshToken) {
  const prepopulate = IdToken && AccessToken && RefreshToken;
  this.UserPoolId = UserPoolId;
  this.ClientId = ClientId;
  this.Pool = new _amazonCognitoIdentityJs.CognitoUserPool({
    UserPoolId,
    ClientId
  });
  this.Username = null;
  this.Details = null;
  this.RefreshToken = null;
  if (!prepopulate) return;
  const decoded = jwtDecode(IdToken);
  this.User = new _amazonCognitoIdentityJs.CognitoUser({
    Username: decoded['cognito:username'],
    Pool: this.Pool
  });
  this.Details = new _amazonCognitoIdentityJs.AuthenticationDetails({
    Username: decoded['cognito:username']
  });
  const idTokenObj = new _amazonCognitoIdentityJs.CognitoIdToken({
    IdToken
  });
  const accessTokenObj = new _amazonCognitoIdentityJs.CognitoAccessToken({
    AccessToken
  });
  const refreshTokenObj = new _amazonCognitoIdentityJs.CognitoRefreshToken({
    RefreshToken
  });
  const session = new _amazonCognitoIdentityJs.CognitoUserSession({
    IdToken: idTokenObj,
    AccessToken: accessTokenObj,
    RefreshToken: refreshTokenObj
  });
  this.RefreshToken = refreshTokenObj;
  this.User.setSignInUserSession(session);
}
Authenticator.prototype.setUsername = function (Username) {
  this.Username = Username;
  this.User = new _amazonCognitoIdentityJs.CognitoUser({
    Username: this.Username,
    Pool: this.Pool
  });
  this.Details = this.Details || new _amazonCognitoIdentityJs.AuthenticationDetails({
    Username
  });
};
Authenticator.prototype.requestOtp = async function (OnGenerateOtpEndpoint, OnMailOtpEndpoint) {
  this.User.setAuthenticationFlowType('CUSTOM_AUTH');
  await _axios.default.post(OnGenerateOtpEndpoint, {
    otp: "otp",
    username: this.Username
  }, {
    headers: {
      "Content-Type": "application/json"
    }
  });
  return new Promise(async (resolve, reject) => {
    const handler = {
      onFailure: error => {
        resolve({
          status: "failure",
          error
        });
      },
      customChallenge: async challengeParameters => {
        const sent = await _axios.default.post(OnMailOtpEndpoint, {
          username: this.Username,
          sessionId: this.User.Session
        }, {
          headers: {
            "Content-Type": "application/json"
          }
        });
        resolve(this.User);
      }
    };
    this.User.initiateAuth(this.Details, handler);
  });
};
Authenticator.prototype.submitOtp = async function (ChallengeResponse) {
  return new Promise(async (resolve, reject) => {
    const handler = {
      onSuccess: async session => {
        this.RefreshToken = session.refreshToken;
        resolve({
          status: "success",
          token: session.idToken.jwtToken,
          session
        });
      },
      onFailure: error => {
        resolve({
          status: "failure",
          error
        });
      },
      customChallenge: async challengeParameters => {
        resolve({
          status: "challenge",
          user: this.User,
          challengeParameters
        });
      }
    };
    this.User.sendCustomChallengeAnswer(ChallengeResponse, handler);
  });
};
Authenticator.prototype.submitPassword = function (Password) {
  this.Details = new _amazonCognitoIdentityJs.AuthenticationDetails({
    Username: this.Username,
    Password
  });
  return new Promise((resolve, reject) => {
    this.User.authenticateUser(this.Details, {
      onSuccess: session => {
        this.RefreshToken = session.refreshToken;
        resolve({
          status: "success",
          token: session.idToken.jwtToken,
          session
        });
      },
      onFailure: error => {
        resolve({
          status: "failure",
          error
        });
      },
      newPasswordRequired: (userAttributes, requiredAttributes) => {
        resolve({
          status: "challenge",
          message: "password-reset"
        });
      }
    });
  });
};
Authenticator.prototype.changePassword = function (oldPassword, newPassword) {
  return new Promise((resolve, reject) => {
    this.User.changePassword(oldPassword, newPassword, (error, result) => {
      if (error) resolve({
        status: "failure",
        error
      });else resolve({
        status: "success",
        user: this.User
      });
    });
  });
};
Authenticator.prototype.forgotPassword = function () {
  return new Promise((resolve, reject) => {
    this.User.forgotPassword({
      onSuccess: response => resolve({
        status: "success",
        user: this.User
      }),
      onFailure: error => resolve({
        status: "error",
        error
      })
    });
  });
};
Authenticator.prototype.setNewPasswordWithResetCode = function (code, password) {
  return new Promise((resolve, reject) => {
    this.User.confirmPassword(code, password, {
      onSuccess: response => {
        resolve({
          status: "success",
          user: this.User
        });
      },
      onFailure: error => resolve({
        status: "failure",
        error
      })
    });
  });
};
Authenticator.prototype.refreshToken = function () {
  return new Promise((resolve, reject) => {
    this.User.refreshSession(this.RefreshToken, (error, session) => {
      if (error) resolve({
        status: "failure",
        error
      });else {
        this.RefreshToken = session.refreshToken;
        resolve({
          status: "success",
          token: session.idToken.jwtToken,
          session
        });
      }
    });
  });
};
