# Authenticator

The **Authenticator** is an NPM utility that provides an easier interface for interacting with Amazon Cognito using the `amazon-cognito-identity-js` library. It simplifies common authentication tasks such as signing in, refreshing tokens, changing passwords, and handling multi-factor authentication (MFA) with OTP codes.

## Installation

```bash
npm install ems-cognito-connector
```

## Usage

```javascript
import { Authenticator } from "ems-cognito-connector";

// Initialize the Authenticator with your User Pool ID and Client ID
const authenticator = new Authenticator("YOUR_USER_POOL_ID", "YOUR_CLIENT_ID");
```

## Methods

- **setUsername(username: string)**: Sets the username for authentication.
- **submitPassword(password: string)**: Submits the password for authentication.
- **refreshToken()**: Refreshes the session tokens using the stored refresh token.
- **changePassword(oldPassword: string, newPassword: string)**: Changes the user's password.
- **forgotPassword()**: Initiates the forgot password flow.
- **setNewPasswordWithResetCode(verificationCode: string, newPassword: string)**: Completes the forgot password flow by setting a new password with the verification code.
- **requestOtp(onGenerateOtpEndpoint: string, onMailOtpEndpoint: string)**: Initiates the custom authentication flow using OTP.
- **submitOtp(otpCode: string)**: Submits the OTP code for verification.

## Examples

### Sign In with Password

```javascript
import { Authenticator } from "ems-cognito-connector";

const authenticator = new Authenticator("YOUR_USER_POOL_ID", "YOUR_CLIENT_ID");

authenticator.setUsername("user@example.com");

const response = await authenticator.submitPassword("YourPassword123!");
console.log(response);
```

### Refresh Session Tokens

```javascript
const refreshResponse = await authenticator.refreshToken();
console.log(refreshResponse);
```

### Change Password

```javascript
const changePasswordResponse = await authenticator.changePassword("OldPassword123!", "NewPassword456!");
console.log(changePasswordResponse);
```

### Forgot Password Flow

#### Initiate Forgot Password

```javascript
const forgotPasswordResponse = await authenticator.forgotPassword();
console.log(forgotPasswordResponse);
```

#### Complete Forgot Password with Verification Code

```javascript
const resetResponse = await authenticator.setNewPasswordWithResetCode("123456", "NewPassword789!");
console.log(resetResponse);
```

### Custom Authentication with OTP

```javascript
import { Authenticator } from "ems-cognito-connector";
import fs from "fs";

const authenticator = new Authenticator("YOUR_USER_POOL_ID", "YOUR_CLIENT_ID");
authenticator.setUsername("user@example.com");

// Request OTP
await authenticator.requestOtp(
  "https://your-api.com/v1/auth/generate-and-save-otp-in-db",
  "https://your-api.com/v1/auth/email-otp"
);
console.log("OTP sent");

// Wait for the OTP to be received (e.g., via email)
// For demonstration purposes, read the OTP from a file after a delay -- get the code from your email and copy it to value.txt before 30s timer elapses
await new Promise((resolve) => setTimeout(resolve, 30000));
const otpCode = fs.readFileSync("./value.txt", "utf8").trim();

// Submit OTP
const otpResponse = await authenticator.submitOtp(otpCode);
console.log(otpResponse);
```

## Constructor Parameters

The `Authenticator` constructor can accept optional parameters for the ID token, access token, and refresh token if you have existing tokens you wish to use.

```javascript
const authenticator = new Authenticator(
  "YOUR_USER_POOL_ID",
  "YOUR_CLIENT_ID",
  idToken,      // Optional
  accessToken,  // Optional
  refreshToken  // Optional
);
```

- **idToken**: The ID token JWT string.
- **accessToken**: The access token JWT string.
- **refreshToken**: The refresh token string.

## Handling Sessions

The `Authenticator` maintains the user session, including handling token refreshes when tokens expire.

## Error Handling

All methods return promises with a status indicator (success, challenge or failure) and should be handled appropriately:

```javascript
 const { status, error, session, token } = await authenticator.submitPassword("YourPassword123!");
 if(status === "failure" || error) alert("Error message to user");
```

## Dependencies

- [amazon-cognito-identity-js](https://www.npmjs.com/package/amazon-cognito-identity-js)
- [axios](https://www.npmjs.com/package/axios) (for HTTP requests during custom authentication flows)

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue to discuss improvements or fixes.

## Contact

For questions or support, please contact [your-email@example.com](mailto:spencech@gmail.com).

---

**Note:** Replace `"YOUR_USER_POOL_ID"` and `"YOUR_CLIENT_ID"` with your actual AWS Cognito User Pool ID and Client ID. Ensure you handle all tokens securely and comply with best practices for authentication in your applications.