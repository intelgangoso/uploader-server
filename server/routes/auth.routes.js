// routes/auth.routes.js

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const app = express();
const multer = require('multer');
const mongoose = require('mongoose');
const userSchema = require("../models/User");
const fileSchema = require('../models/File');
const authorize = require("../middlewares/auth");
const fs = require('fs');
const fsExtra = require('fs-extra');
const ip = require('ip');
const { check, validationResult } = require('express-validator');

app.use(express.static('../uploads'));

const ensureFolder = (req, res, next) => {
    let dir = './uploads/' + req.params.id + "/";
    fsExtra.ensureDir(dir)
    .then()
    .catch(err => {
        console.error(err)
    })
    next();
};

const folder = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/' + req.params.id + '/');
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname.toLowerCase().split(' ').join('-');
    cb(null, fileName)
  }
});

var upload = multer({
    storage: folder,
    fileFilter: (req, file, cb) => {
      if ((file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") || 
      file.mimetype == "video/mp4" || file.mimetype == "video/mpg4" || file.mimetype == "video/mpeg4") {
        cb(null, true);
      } else {
        cb(null, false);
        return cb(new Error('Only .mp4, .mpg4, .mpeg4, .jpg and .jpeg format allowed!'));
      }
    }
  });

// Sign-up
app.post("/register-user",
    [
        check('name')
            .not()
            .isEmpty()
            .isLength({ min: 3 })
            .withMessage('Name must be atleast 3 characters long'),
        check('email', 'Email is required')
            .not()
            .isEmpty(),
        check('password', 'Password should be between 5 to 20 characters long')
            .not()
            .isEmpty()
            .isLength({ min: 5, max: 20 })
    ],
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).jsonp(errors.array());
        }
        else {
            bcrypt.hash(req.body.password, 10).then((hash) => {
                const user = new userSchema({
                    name: req.body.name,
                    email: req.body.email,
                    password: hash
                });
                user.save().then((response) => {
                    res.status(201).json({
                        message: "User successfully created!",
                        result: response
                    });
                }).catch(error => {
                    res.status(500).json({
                        error: error
                    });
                });
            });
        }
    });


// Sign-in
app.post("/signin", (req, res, next) => {
    let getUser;
    userSchema.findOne({
        email: req.body.email
    }).then(user => {
        if (!user) {
            return res.status(401).json({
                message: "Authentication failed"
            });
        }
        getUser = user;
        return bcrypt.compare(req.body.password, user.password);
    }).then(response => {
        if (!response) {
            return res.status(401).json({
                message: "Authentication failed"
            });
        }
        let jwtToken = jwt.sign({
            email: getUser.email,
            userId: getUser._id
        }, "not-so-secret-token", {
            expiresIn: "1h"
        });
        res.status(200).json({
            token: jwtToken,
            expiresIn: 3600,
            _id: getUser._id
        });
    }).catch(err => {
        return res.status(401).json({
            message: "Authentication failed"
        });
    });
});

// Get Users
app.route('/').get((req, res) => {
    userSchema.find((error, response) => {
        if (error) {
            return next(error)
        } else {
            res.status(200).json(response)
        }
    })
})

// Get Single User
app.route('/user-profile/:id').get(authorize, (req, res, next) => {
    userSchema.findById(req.params.id, (error, data) => {
        if (error) {
            return next(error);
        } else {
            if (res.status(200)) {
                let addr = req.secure ? 'https://': 'http://' + ip.address() + ':' + req.connection.localPort + '/uploads/' + req.params.id;
                fs.readdir('./uploads/' + req.params.id + '/', (err, files) => {
                    res.status(200).json({
                        msg: data,
                        addr: addr,
                        files: files
                    })
                });
            }
        }
    });
})
  
// app.use()

app.post('/create-file/:id', ensureFolder, upload.array('avatar', 6), (req, res, next) => {
    const reqFiles = []

    for (var i = 0; i < req.files.length; i++) {
        let dir = './uploads/' + req.params.id + '/' + req.files[i].filename;        
    }

    const file = new fileSchema({
        userId: req.params.id,
        _id: new mongoose.Types.ObjectId(),
        avatar: reqFiles
    });
    file.save().then(result => {
      res.status(201).json({
        message: "Done upload!",
        fileCreated: {
            userId: result.userId,
            _id: result._id,
            avatar: result.avatar
        }
      })
    }).catch(err => {
        res.status(500).json({
          error: err
        });
    })
    
})

// Update User
app.route('/update-user/:id').put((req, res, next) => {
    userSchema.findByIdAndUpdate(req.params.id, {
        $set: req.body
    }, (error, data) => {
        if (error) {
            return next(error);
        } else {
            res.json(data)
        }
    })
})


// Delete User
app.route('/delete-user/:id').delete((req, res, next) => {
    userSchema.findByIdAndRemove(req.params.id, (error, data) => {
        if (error) {
            return next(error);
        } else {
            res.status(200).json({
                msg: data
            })
        }
    })
})

module.exports = app;
