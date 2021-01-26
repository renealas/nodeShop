const express = require('express');
const { check, body } = require('express-validator/check');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login', [
    body('email')
    .isEmail()
    .withMessage('Favor Ingrese un Correo Electronico')
    .normalizeEmail(),
    body('password')
    .isLength({min: 5})
    .withMessage('Correo o Contraseña Incorrecto!')
    .trim()
], authController.postLogin);

router.post(
    '/signup',
    [
        check('email')
            .isEmail()
            .withMessage('Favor Introdusca un Correo Valido')
            .custom((value, { req }) => {
                // if(value === 'test@test.com'){
                //     throw new Error('Este Correo esta Prohibido');
                // }
                // return true;
                return User.findOne({ email: value })
                    .then(userDoc => {
                        if (userDoc) {
                            return Promise.reject(
                                'El Correo ya esta en uso, favor seleccione otro'
                                );
                        }
                    });
                })
                .normalizeEmail(),
                    body('password', 'Porfavor introdusca una Contraseña con al menos 5 Caracteres')
                        .isLength({ min: 5 })
                        .trim(),
                    body('confirmPassword')
                    .trim()
                    .custom((value, { req }) => {
                        if (value !== req.body.password) {
                            throw new Error('Las Contraseña no es la misma en campo de Confirmacion');
                        }
                        return true;
                    })
    ],
    authController.postSignup
);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;