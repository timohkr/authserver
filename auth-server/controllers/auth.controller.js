const db = require("../models");
const User = db.user;
const Role = db.role;
const UserRecord = db.userRecord;
const Op = db.Sequelize.Op;
const UserValidate = db.userValidate;
const GAuth = db.gAuth;
const QRCode = require('qrcode')
const axios = require('axios'); 
const { authenticator } = require('otplib')
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const fs = require('fs');
const privateKey = fs.readFileSync('private.key', 'utf8');
const publicKey = fs.readFileSync('public.key', 'utf8');


const { sendMail } = require("./mail.controller");
const { auth } = require("googleapis/build/src/apis/abusiveexperiencereport");

function generateOTP() {
	let code = Math.floor(Math.random() * 1000000);
	code = code.toString().padStart(6, "0");
	return code;
}

exports.signup = (req, res) => {
	// Save User to Database
	let sub = null;
	let status = null;

	UserRecord.findOne({
		where: {
			email: req.body.email,
		},
	})
		.then((user) => {
			if (!user) {
				res.status(404).send({ message: "Email not found", success: false });
			}
			sub = user.sub;
			status = user.status;
			User.create({
				sub: sub,
				email: req.body.email,
				password: bcrypt.hashSync(req.body.password, 8),
				first_name: req.body.first_name,
				last_name: req.body.last_name,
				birthdate: req.body.birthdate,
				status: status,
			}).then((user) => {
				if (req.body.roles) {
					Role.findAll({
						where: {
							name: {
								[Op.or]: req.body.roles,
							},
						},
					}).then((roles) => {
						user.setAuthTypes(1);
						user.setRoles(roles).then(() => {
							res.send({ message: "User was registered successfully!" });
						});
					});
				} else {
					// user role = 1
					user.setAuthTypes(1);
					user.setRoles([1]).then(() => {
						res.send({ message: "User was registered successfully!" });
					});
				}
			});
		})
		.catch((err) => {
			res.status(500).send({ message: err.message });
		});
};

exports.tokenExchange = async (req, res) => {
	const { code } = req.body;
    if (!code) {
        return res.status(400).json({ message: "Bad Request" });
    }

    try {
		const clientId = "mDQuoTihIwUmrhi5_r1pvNGzp8NmBhoI7UDGWEbxGuw";
		const clientSecret = "fJNSPWx-YWnLhrYIapsH2Mc4AwtwDNeKVvl4zdmFsYA";
		const redirectUri = "http://localhost:5173/sso-login";
  		// get access token
        const response = await axios.post("https://smurnauth-production.fly.dev/oauth/token", {
            client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code',
            code,
        });

        if (response.data && response.data.access_token) {
			const accessToken = response.data.access_token;
			res.cookie("Authorization", accessToken, {
				httpOnly: true,
				sameSite: "None",
				secure: true,
				maxAge: 1 * 60 * 60 * 1000,
			});
            return res.status(200).json({ access_token: accessToken });

        } else {
            return res.status(400).json({ message: "Invalid response from the bank's server" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

exports.userInfo = async (req, res) => {
	try {
		// Ensure the request includes the Authorization header
	  const authHeader = req.headers.authorization || req.headers.Authorization; // Handle both cases
		
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
	
		// Split the Authorization header to extract the token
		const authHeaderParts = authHeader.split(" ");
		if (authHeaderParts.length !== 2 || authHeaderParts[0] !== 'Bearer') {
			return res.status(401).json({ message: 'Invalid Authorization header format' });
		}
	
		const accessToken = authHeaderParts[1];

	
		// Make a GET request to the user info endpoint
		const response = await axios.get('https://smurnauth-production.fly.dev/oauth/userinfo', {
			headers: {
			Authorization: `Bearer ${accessToken}`,
			},
		});
	
		// Return the user information from the response
		const userInfo = response.data;
		return res.status(200).json(userInfo);
		} catch (error) {
		// Handle errors, such as network issues or invalid tokens
		console.error(error);
		res.status(500).json({ message: 'Internal Server Error' });
		}
	};
	
	
	


exports.deleteAccount = async (req, res) => {
	let token = req.headers.authorization.split(" ")[1];
	let content = jwt.decode(token);
	console.log(content);
	const user = await User.findOne({
		where: {
			sub: content.id,
		},
	});
	if (!user) {
		return res.status(404).send({ message: "User Not found.", success: false });
	}
	User.destroy({
		where: {
			sub: content.id,
		},
	})

	UserValidate.destroy({
		where: {
			email: user.email
		}
	})

	GAuth.destroy({
		where: {
			email: user.email
		}
	})
	return res.send({ success: true, message: "User successfully deleted" });
}




exports.jwks = async (req, res) => {
	res.send({
		publicKey
	})
}

exports.signin = async (req, res) => {
	const { email, password } = req.body;

	if (!email || email === "") {
		res.status(400);
		res.send("Please enter an email");
		return;
	}

	if (!password || password === "") {
		res.status(400);
		res.send("Please enter a password");
		return;
	}

	const user = await User.findOne({
		where: {
			email: email,
		},
	});

	if (!user) {
		res.status(400);
		res.send("Invalid Username / Password");
		return;
	}

	const passwordMatch = bcrypt.compareSync(password, user.password);

	if (!passwordMatch) {
		res.status(400);
		res.send("Invalid Username or Password");
		return;
	}

	// Get authentication type
	const authTypes = await user.getAuthTypes();

	// OTP
	if (authTypes[0].id === 1) {
		// Send OTP function
		const otpCode = generateOTP();
		try {
			// Find the record based on a unique identifier (e.g., primary key)
			const [record, created] = await UserValidate.findOrCreate({
				where: { email: email },
				defaults: { email: email, otp: bcrypt.hashSync(otpCode, 8), status: 1 },
			});

			if (created) {
				// console.log("New record created:", record.toJSON());
			} else {
				const updatedRecord = await record.update({
					email: email,
					otp: bcrypt.hashSync(otpCode, 8),
					status: 1,
				});
				// console.log("Existing record updated:", record.toJSON());
			}

			if (record) {
				data = {
					email: email,
					code: otpCode,
				};

				// Async call to email, if fail then call again
				await sendMail(data);
				res.send({type: 1, message: "Please enter OTP"});
			}
		} catch (error) {
			res.status(500);
			res.send(error);
		}
	} else if (authTypes[0].id === 2) {
		// verify Gauth code
		res.send({type: 2, message: "Open your authenticator app and enter otp"});
	}
	else {
		const user = await User.findOne({
			where: {
				email: email,
			},
		});

		// Grant user access, generate and provide the token
		const authorities = [];

		user.getRoles().then((roles) => {
			for (let i = 0; i < roles.length; i++) {
				authorities.push(roles[i].name);
			}
			const token = jwt.sign({ user: { id: user.sub, roles: authorities, email: user.email } }, privateKey, {
				algorithm: "RS256",
				expiresIn: 3600, // 1 hour,
				issuer: "Auth App",
				audience: process.env.ORIGIN,
				subject: user.sub
			});

			const refreshToken = jwt.sign({ id: user.sub }, process.env.REFRESHSECRET, {
				algorithm: "HS256",
				allowInsecureKeySizes: true,
				expiresIn: 86400, // 24 hours
			});

			res.cookie("jwt", token, {
				httpOnly: true,
				sameSite: "None",
				secure: true,
				maxAge: 1 * 60 * 60 * 1000,
			});
			res.status(200).send({
				sub: user.sub,
				username: user.username,
				email: user.email,
				roles: authorities,
				accessToken: token,
			});
		});
	}
};

exports.signinOtp = async (req, res) => {
	const { email, code } = req.body;
	if (!email || email === "") {
		res.status(400);
		res.send("Please enter an email");
		return;
	}

	if (!code || code === "") {
		res.status(400);
		res.send("Please enter the otp");
		return;
	}

	const validUser = await UserValidate.findOne({
		where: {
			email: email,
		},
	});

	// User doesnt exist
	if (!validUser || validUser.status === 0) {
		res.status(400);
		res.send("Bad Request");
		return;
	}

	// OTP password expired
	const updateTime = new Date(validUser.updatedAt);
	const currentTime = new Date();
	const timeDiffMins = (currentTime - updateTime) / 60000;
	if (timeDiffMins > 5) {
		await UserValidate.update({ status: 0 }, { where: { email: email } });
		res.status(400);
		res.send("OTP expired, please request a new OTP");
		return;
	}

	// OTP doesnt exist
	if (validUser.status === 0) {
		res.status(400);
		res.send("Invalid request, please try again");
		return;
	}

	const validateOTP = bcrypt.compareSync(code, validUser.otp);

	if (!validateOTP) {
		res.status(400);
		res.send("Invalid OTP, please try again");
		return;
	}

	// make the otp invalid
	await UserValidate.update({ status: 0 }, { where: { email: email } });

	// Update user Status if not activated
	await User.update({ status: "active" }, { where: { email: email } });

	// SUCCESS VERIFICATION, GET USER
	const user = await User.findOne({
		where: {
			email: email,
		},
	});

	const authorities = [];

	user.getRoles().then((roles) => {
		for (let i = 0; i < roles.length; i++) {
			authorities.push(roles[i].name);
		}
		const token = jwt.sign({ user: { id: user.sub, roles: authorities, email: user.email } }, privateKey, {
			algorithm: "RS256",
			expiresIn: 3600, // 1 hour,
			issuer: "Auth App",
			audience: process.env.ORIGIN,
			subject: user.sub
		});

		const refreshToken = jwt.sign({ id: user.sub }, process.env.REFRESHSECRET, {
			algorithm: "HS256",
			allowInsecureKeySizes: true,
			expiresIn: 86400, // 24 hours
		});

		res.cookie("jwt", token, {
			httpOnly: true,
			sameSite: "None",
			secure: true,
			maxAge: 1 * 60 * 60 * 1000,
		});
		res.status(200).send({
			sub: user.sub,
			username: user.username,
			email: user.email,
			roles: authorities,
			accessToken: token,
		});
	});
}

exports.validateQR = async (req, res) => {
  const { email, code } = req.body

  // Check for valid inputs
  if (!email || email === ""){
    res.status(400).send({ message: "Invalid email" });
    return
  } 

  if (!code || code === ""){
    res.status(400).send({ message: "Invalid code" });
    return
  }
 
  return verifyLogin(email, code, req, res)
};

async function verifyLogin(email, code, req, res) {
  //load user by email
  const gAuthUser = await GAuth.findOne({
		where: {
			email: email,
		},
	});

  if (!gAuthUser){
    res.status(400).send("Bad Request")
    return
  }

  if (!authenticator.check(code, gAuthUser.secret)) {
    res.status(400).send("Bad Request")
    return
  }

  // SUCCESS VERIFICATION, GET USER
	const user = await User.findOne({
		where: {
			email: email,
		},
	});


	var authorities = [];

	user.getRoles().then((roles) => {
		for (let i = 0; i < roles.length; i++) {
			authorities.push(roles[i].name);
		}
		const token = jwt.sign({ user: { id: user.sub, roles: authorities, email: user.email } }, privateKey, {
			algorithm: "RS256",
			expiresIn: 3600, // 1 hour,
			issuer: "Auth App",
			audience: process.env.ORIGIN,
			subject: user.sub
		});

		const refreshToken = jwt.sign({ id: user.sub }, process.env.REFRESHSECRET, {
			algorithm: "HS256",
			allowInsecureKeySizes: true,
			expiresIn: 86400, // 24 hours
		});

		res.cookie("jwt", token, {
			httpOnly: true,
			sameSite: "None",
			secure: true,
			maxAge: 1 * 60 * 60 * 1000,
		});
		res.status(200).send({
			sub: user.sub,
			username: user.username,
			email: user.email,
			roles: authorities,
			accessToken: token,
		});
	});
}

exports.generateQR = async (req, res) => {
  const { email } = req.body

  // Check for valid inputs
  if (!email || email === ""){
    res.status(400).send({ message: "Invalid email" });
    return
  } 

	const secret = authenticator.generateSecret();
  const [record, created] = await GAuth.findOrCreate({
    where: { email: email },
    defaults: { email: email, secret: secret },
  });

  if (created) {
	  // console.log("New record created:", record.toJSON());
  } else {
    const updatedRecord = await record.update({
      email: email,
      secret: secret
    });
	  // console.log("Existing record updated:", record.toJSON());
  }

  if (record) {
    QRCode.toDataURL(authenticator.keyuri(email, '2FA Node App', secret), (err, url) => {
      if (err) {
        res.status(500).send("Failed")
        return
      }

      res.status(200).send({
        email: email,
        qr: url,
      })
    })
  } else {
    res.status(500).send("Failed")
  }
};