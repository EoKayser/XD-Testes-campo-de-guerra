const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// File to store products
const PRODUCTS_FILE = path.join(__dirname, 'products.json');

// Initialize products file if it doesn't exist
if (!fs.existsSync(PRODUCTS_FILE)) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([]));
}

// Helper function to read products
function readProducts() {
  try {
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading products:', error);
    return [];
  }
}

// Helper function to write products
function writeProducts(products) {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
  } catch (error) {
    console.error('Error writing products:', error);
  }
}

// Routes
app.get('/api/products', (req, res) => {
  const products = readProducts();
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const { name, price, img } = req.body;
  if (!name || !price || !img) {
    return res.status(400).json({ error: 'Nome, preço e imagem são obrigatórios' });
  }

  const products = readProducts();
  const newProduct = {
    id: Date.now(),
    name,
    price: String(price),
    img,
    promoEnabled: false,
    promoPrice: ''
  };
  products.push(newProduct);
  writeProducts(products);
  res.json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const products = readProducts();
  const index = products.findIndex(p => p.id == id);

  if (index === -1) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }

  products[index] = { ...products[index], ...updates };
  writeProducts(products);
  res.json(products[index]);
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const products = readProducts();
  const filteredProducts = products.filter(p => p.id != id);

  if (filteredProducts.length === products.length) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }

  writeProducts(filteredProducts);
  res.json({ message: 'Produto removido' });
});

// Admin authentication (simple for demo)
const ADMIN_USER = 'kayser';
const ADMIN_PASS = '1234';

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
