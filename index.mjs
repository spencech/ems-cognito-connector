import AmazonCognitoIdentity from 'amazon-cognito-identity-js';
const { AuthenticationDetails, CognitoUserPool, CognitoUser } = AmazonCognitoIdentity;
import axios from "axios";

export function Authenticator(UserPoolId, ClientId) {
  this.UserPoolId = UserPoolId;
  this.ClientId = ClientId;
  this.Pool = new CognitoUserPool({ UserPoolId, ClientId });
  this.Username = null;
  this.Details = null;
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
          resolve({ status: "success", token: session.idToken.jwtToken, session });
        },
        onFailure: (error) => {
          resolve({ status: "failure", error });
        },
        customChallenge: async (challengeParameters) => { 
          resolve({ user: this.User, challengeParameters });  
        }
      };
      this.User.sendCustomChallengeAnswer(ChallengeResponse, handler);
    });
}

Authenticator.prototype.submitPassword = function(Password) {
  this.Details = new AuthenticationDetails({ Username: this.Username, Password});
  return new Promise((resolve, reject) => {
    if(!this.Pool.getCurrentUser()) authenticateUser(this.User, this.Details, resolve, reject);
    else return this.User.getSession();
  });
}

async function authenticateUser(user, details, resolve, reject) {
    user.authenticateUser(details, {
        onSuccess: (session) => { 
          resolve({ status: "success", token: session.idToken.jwtToken, session });
        },
        onFailure: (error) => {
          resolve({ status: "failure", error });
        },
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          resolve({ status: "success",  message: "password-reset" });
        }
    });
}
