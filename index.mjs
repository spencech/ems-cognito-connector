function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
import { AuthenticationDetails, CognitoUserPool, CognitoUser, CognitoIdToken, CognitoAccessToken, CognitoRefreshToken, CognitoUserSession } from 'amazon-cognito-identity-js';
import axios from "axios";
import * as Decoded from "jwt-decode";
export function Authenticator(UserPoolId, ClientId, IdToken, AccessToken, RefreshToken) {
  var prepopulate = IdToken && AccessToken && RefreshToken;
  this.UserPoolId = UserPoolId;
  this.ClientId = ClientId;
  this.Pool = new CognitoUserPool({
    UserPoolId,
    ClientId
  });
  this.Username = null;
  this.Details = null;
  this.RefreshToken = null;
  this.AccessToken = null;
  if (!prepopulate) return;
  var decoded = jwtDecode(IdToken);
  this.User = new CognitoUser({
    Username: decoded['cognito:username'],
    Pool: this.Pool
  });
  this.Details = new AuthenticationDetails({
    Username: decoded['cognito:username']
  });
  var idTokenObj = new CognitoIdToken({
    IdToken
  });
  var accessTokenObj = new CognitoAccessToken({
    AccessToken
  });
  var refreshTokenObj = new CognitoRefreshToken({
    RefreshToken
  });
  var session = new CognitoUserSession({
    IdToken: idTokenObj,
    AccessToken: accessTokenObj,
    RefreshToken: refreshTokenObj
  });
  this.RefreshToken = refreshTokenObj;
  this.AccessToken = accessTokenObj;
  this.User.setSignInUserSession(session);
}
Authenticator.prototype.setUsername = function (Username) {
  this.Username = Username;
  this.User = new CognitoUser({
    Username: this.Username,
    Pool: this.Pool
  });
  this.Details = this.Details || new AuthenticationDetails({
    Username
  });
};
Authenticator.prototype.requestOtp = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator(function* (OnGenerateOtpEndpoint, OnMailOtpEndpoint) {
    var _this = this;
    this.User.setAuthenticationFlowType('CUSTOM_AUTH');
    yield axios.post(OnGenerateOtpEndpoint, {
      otp: "otp",
      username: this.Username
    }, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    return new Promise(/*#__PURE__*/function () {
      var _ref2 = _asyncToGenerator(function* (resolve, reject) {
        var handler = {
          onFailure: error => {
            resolve({
              status: "failure",
              error
            });
          },
          customChallenge: function () {
            var _customChallenge = _asyncToGenerator(function* (challengeParameters) {
              var sent = yield axios.post(OnMailOtpEndpoint, {
                username: _this.Username,
                sessionId: _this.User.Session
              }, {
                headers: {
                  "Content-Type": "application/json"
                }
              });
              resolve(_this.User);
            });
            function customChallenge(_x5) {
              return _customChallenge.apply(this, arguments);
            }
            return customChallenge;
          }()
        };
        _this.User.initiateAuth(_this.Details, handler);
      });
      return function (_x3, _x4) {
        return _ref2.apply(this, arguments);
      };
    }());
  });
  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();
Authenticator.prototype.submitOtp = /*#__PURE__*/function () {
  var _ref3 = _asyncToGenerator(function* (ChallengeResponse) {
    var _this2 = this;
    return new Promise(/*#__PURE__*/function () {
      var _ref4 = _asyncToGenerator(function* (resolve, reject) {
        var handler = {
          onSuccess: function () {
            var _onSuccess = _asyncToGenerator(function* (session) {
              _this2.RefreshToken = session.refreshToken;
              resolve({
                status: "success",
                token: session.idToken.jwtToken,
                session
              });
            });
            function onSuccess(_x9) {
              return _onSuccess.apply(this, arguments);
            }
            return onSuccess;
          }(),
          onFailure: error => {
            resolve({
              status: "failure",
              error
            });
          },
          customChallenge: function () {
            var _customChallenge2 = _asyncToGenerator(function* (challengeParameters) {
              resolve({
                status: "challenge",
                user: _this2.User,
                challengeParameters
              });
            });
            function customChallenge(_x10) {
              return _customChallenge2.apply(this, arguments);
            }
            return customChallenge;
          }()
        };
        _this2.User.sendCustomChallengeAnswer(ChallengeResponse, handler);
      });
      return function (_x7, _x8) {
        return _ref4.apply(this, arguments);
      };
    }());
  });
  return function (_x6) {
    return _ref3.apply(this, arguments);
  };
}();
Authenticator.prototype.submitPassword = function (Password) {
  this.Details = new AuthenticationDetails({
    Username: this.Username,
    Password
  });
  return new Promise((resolve, reject) => {
    this.User.authenticateUser(this.Details, {
      onSuccess: session => {
        this.RefreshToken = session.refreshToken;
        this.AccessToken = session.accessToken;
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
        this.AccessToken = session.accessToken;
        this.RefreshToken = session.refreshToken;
        resolve({
          status: "success",
          token: session.idToken.jwtToken,
          access: session.accessToken.jwtToken,
          refresh: session.refreshToken.jwtToken,
          session
        });
      }
    });
  });
};
