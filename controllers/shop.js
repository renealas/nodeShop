const fs = require('fs');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_KEY);

const PDFDocument = require('pdfkit');

const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find()
  .countDocuments()
  .then(numProducts => {
    totalItems = numProducts;
    return Product.find()
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);
  })
  .then(products => {
    res.render('shop/product-list', {
      prods: products,
      pageTitle: 'Productos',
      path: '/products',
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalItems,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
    });
  })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find()
  .countDocuments()
  .then(numProducts => {
    totalItems = numProducts;
    return Product.find()
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);
  })
  .then(products => {
    res.render('shop/index', {
      prods: products,
      pageTitle: 'Tienda',
      path: '/',
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalItems,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
    });
  })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Tu Cesta',
        products: products,
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      //console.log(result);
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) =>{
  let products;
  let total = 0;
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      products = user.cart.items;
      total = 0;
      products.forEach(p => {
        total += p.quantity * p.productId.price;
      });
      return stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: products.map(p => {
          return {
            name: p.productId.title,
            descripton: p.productId.descripton,
            amount: p.productId.price * 100,
            currency: 'usd',
            quantity: p.quantity
          };
        }),
        success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
        cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
      });      
    })
    .then(session => {
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Pago',
        products: products,
        totalSum: total,
        sessionId: session.id
      });
    })
    .catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckoutSuccess = (req, res, next) => {
  let totalOrder = 0;
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        totalOrder = totalOrder + i.productId.price * i.quantity;
        return { quantity: i.quantity, product: { ...i.productId._doc }, totalProduct: i.productId.price * i.quantity };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products,
        total: {
          totalOrder: totalOrder,
        }
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  let totalOrder = 0;
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        totalOrder = totalOrder + i.productId.price * i.quantity;
        return { quantity: i.quantity, product: { ...i.productId._doc }, totalProduct: i.productId.price * i.quantity };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products,
        total: {
          totalOrder: totalOrder,
        }
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Tus Ordenes',
        orders: orders,
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then(order => {
      if (!order) {
        return next(new Error('No se Encontro la Order'));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error('No estas Autorizado'));
      }
      const invoiceName = 'invoice-' + orderId + '.pdf';
      const invoicePath = path.join('data', 'invoices', invoiceName);

      var meses = new Array("Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre");
      var f = new Date();
      const fechaEsp = f.getDate() + " de " + meses[f.getMonth()] + " de " + f.getFullYear();

      const pdfDoc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'inLine; filename="' + invoiceName + '"'
      );
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      //Cabecera de la Factura
      pdfDoc
        .image("images/logo.jpg", 50, 45, { width: 75 })
        .fillColor("#444444")
        .font("Helvetica-Bold")
        .fontSize(20)
        .text("ChispiStore S.A. de C.V.", 110, 57)
        .font("Helvetica")
        .fontSize(10)
        .text("Res. Altos de Santa Monica, Senda 2 A", 100, 65, { align: "right" })
        .text("Santa Tecla, La Libertad", 100, 50, { align: "right" })
        .moveDown();

      //Linea de Division
      //pdfDoc.text('-----------------------');

      //Informacion del Cliente
      pdfDoc
        .text(`Numero de Factura: ${order._id}`, 50, 200)
        .text(`Fecha de Facturacion: ${fechaEsp}`, 50, 215)
        .moveDown()
        .moveDown()
        .moveDown()
        .text(`Cliente: ${order.user.userId}`, 50, 230)
        .moveDown()
        .moveDown();

      //Calculo de Total
      let totalPrice = 0;

      pdfDoc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text('Productos', 50, 270)

      pdfDoc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text('-----------------------', 50, 280)

      //Loop de la Info a Imprimir
      order.products.forEach(prod => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc
          .fontSize(14)
          .font("Helvetica")
          .text(
            prod.product.title +
            '  ' +
            prod.quantity +
            '  ' +
            '$' +
            prod.product.price
          );
      });

      pdfDoc.moveDown();
      //Linea de Division
      pdfDoc.text('-----------------------');

      //Impresion de total
      pdfDoc.fontSize(14).text('Total: $' + totalPrice);


      //Footer
      pdfDoc
        .fontSize(10)
        .text(
          "Gracias por su Compra. Le esperamos de Vuelta",
          50,
          500,
          { align: "center", width: 500 }
        );

      pdfDoc.end();
      // fs.readFile(invoicePath, (err, data) => {
      //   if (err) {
      //     return next(err);
      //   }
      //   res.setHeader('Content-Type', 'application/pdf');
      //   res.setHeader('Content-Disposition', 'inLine; filename="' + invoiceName + '"');
      //   res.send(data);
      // });
      //const file = fs.createReadStream(invoicePath);

      //file.pipe(res);
    })
    .catch(err => next(err));
};