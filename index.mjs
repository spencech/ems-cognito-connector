import AmazonCognitoIdentity from 'amazon-cognito-identity-js';
import axios from "axios";
import jwtDecode from "jwt-decode";

const { AuthenticationDetails, CognitoUserPool, CognitoUser, CognitoIdToken, CognitoAccessToken, CognitoRefreshToken, CognitoUserSession } = AmazonCognitoIdentity;

export function Authenticator(UserPoolId, ClientId, IdToken, AccessToken, RefreshToken) {
  const prepopulate = IdToken && AccessToken && RefreshToken;
  this.UserPoolId = UserPoolId;
  this.ClientId = ClientId;
  this.Pool = new CognitoUserPool({ UserPoolId, ClientId });
  this.Username = null;
  this.Details = null;
  this.RefreshToken = null;

  if(!prepopulate) return;
  
  const decoded  = jwtDecode(idToken);

  this.User = new CognitoUser({
    Username: decoded['cognito:username'],
    Pool: this.pool
  });

  const idTokenObj = new CognitoIdToken({ IdToken: idToken });
  const accessTokenObj = new CognitoAccessToken({ AccessToken: accessToken });
  const refreshTokenObj = new CognitoRefreshToken({ RefreshToken: refreshToken });
  const session = new CognitoUserSession({ IdToken: idTokenObj, AccessToken: accessTokenObj, RefreshToken: refreshTokenObj });
  this.RefreshToken = refreshTokenObj;
  this.User.setSignInUserSession(session);
}


Authenticator.prototype.setUsername = function(Username) {
  this.Username = Username;
  this.User = new CognitoUser({ Username: this.Username, Pool: this.Pool });
  this.Details = this.Details || new AuthenticationDetails({ Username });
}

Authenticator.prototype.requestOtp = async function(OnGenerateOtpEndpoint,OnMailOtpEndpoint) {

  this.User.setAuthenticationFlowType('CUSTOM_AUTH');

  await axios.post(OnGenerateOtpEndpoint, { otp: "otp", username: this.Username } , { headers: { "Content-Type": "application/json" } })
          
  return new Promise(async(resolve, reject) => {
      const handler = {
        onFailure: (error) => {
          resolve({ status: "failure", error });
        },
        customChallenge: async (challengeParameters) => { 
          const sent = await axios.post(OnMailOtpEndpoint, { username:this.Username, sessionId: this.User.Session } , { headers: { "Content-Type": "application/json" } });
          resolve(this.User);  
        }
      };
      this.User.initiateAuth(this.Details, handler);
    });
}

Authenticator.prototype.submitOtp = async function(ChallengeResponse) {
  return new Promise(async(resolve, reject) => {
      const handler = {
        onSuccess: async (session) => {
          this.RefreshToken = session.refreshToken;
          resolve({ status: "success", token: session.idToken.jwtToken, session });
        },
        onFailure: (error) => {
          resolve({ status: "failure", error });
        },
        customChallenge: async (challengeParameters) => { 
          resolve({ status: "challenge", user: this.User, challengeParameters });  
        }
      };
      this.User.sendCustomChallengeAnswer(ChallengeResponse, handler);
    });
}

Authenticator.prototype.submitPassword = function(Password) {
  this.Details = new AuthenticationDetails({ Username: this.Username, Password});
  return new Promise((resolve, reject) => {
    this.User.authenticateUser(this.Details, {
        onSuccess: (session) => { 
          this.RefreshToken = session.refreshToken;
          resolve({ status: "success", token: session.idToken.jwtToken, session });
        },
        onFailure: (error) => {
          resolve({ status: "failure", error });
        },
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          resolve({ status: "challenge",  message: "password-reset" });
        }
    });
  });
}

Authenticator.prototype.changePassword = function(oldPassword, newPassword) {
  return new Promise(( resolve, reject) => {
       this.User.changePassword(oldPassword, newPassword, (error, result) => {
         if(error) resolve({ status: "failure", error });
         else resolve({ status: "success", user: this.User });
       })
    })
}

Authenticator.prototype.forgotPassword = function() {
  return new Promise((resolve, reject) => {
       this.User.forgotPassword({
         onSuccess: (response) => resolve({ status: "success", user: this.User }),
         onFailure: (error) => resolve({ status: "error", error })
       });
    });
}

Authenticator.prototype.setNewPasswordWithResetCode = function(code, password) {
  return new Promise((resolve, reject ) => {
       this.User.confirmPassword(code, password, {
         onSuccess: (response) => { resolve({ status: "success", user: this.User}) },
         onFailure: (error) => resolve({ status: "failure", error })
       })
    });
}

Authenticator.prototype.refreshToken = function() {
  return new Promise((resolve, reject) => {
    this.User.refreshSession(this.RefreshToken, (error, session) => {
      if(error) resolve({ status: "failure", error });
      else {
        this.RefreshToken = session.refreshToken;
        resolve({ status: "success", token: session.idToken.jwtToken, session });
      }
    })
  });
}



