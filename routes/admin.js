const path = require('path');

const express = require('express');
const {body} = require('express-validator/check');

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

// /admin/add-product => GET
router.get('/add-product', isAuth, adminController.getAddProduct);

router.get('/products',
[
    body('title')
    .isAlphanumeric()
    .isLength({min: 3})
    .trim(),
    body('price')
    .isFloat(),
    body('description')
    .isLength({min: 5, max: 500})
    .trim()
]
, isAuth, adminController.getProducts);

// // /admin/products => POST
router.post('/add-product', 
[
    body('title')
    .isString()
    .isLength({min: 3})
    .withMessage('Titulo debe tener Minimo 3 Caracateres')
    .trim(),
    body('price')
    .isFloat()
    .withMessage('Precio debe contener decimales Ej: $1 es $1.00'),
    body('description')
    .isLength({min: 5, max: 500})
    .withMessage('Descripcion debe tener entre 5 y 500 Caracteres')
    .trim()
]
, isAuth, adminController.postAddProduct);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post('/edit-product', 
[
    body('title')
    .isString()
    .isLength({min: 3})
    .withMessage('Titulo debe tener Minimo 3 Caracateres')
    .trim(),
    body('price')
    .isFloat()
    .withMessage('Precio debe contener decimales Ej: $1 es $1.00'),
    body('description')
    .isLength({min: 5, max: 500})
    .withMessage('Descripcion debe tener entre 5 y 500 Caracteres')
    .trim()
],
isAuth, adminController.postEditProduct);

router.delete('/product/:productId', isAuth, adminController.deleteProduct);

module.exports = router;
