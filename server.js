const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DONATIONS_FILE = path.join(__dirname, 'donations.json');

// Middleware
app.use(cors());
app.use(express.json());

// Helper: Read donations from file
function readDonations() {
  try {
    const data = fs.readFileSync(DONATIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Helper: Write donations to file
function writeDonations(donations) {
  fs.writeFileSync(DONATIONS_FILE, JSON.stringify(donations, null, 2));
}

// ========================================
// API ENDPOINTS
// ========================================

// GET /donations - Lấy danh sách donations
app.get('/donations', (req, res) => {
  const donations = readDonations();
  res.json(donations);
});

// GET /donations/latest - Lấy donations mới nhất (cho polling)
app.get('/donations/latest', (req, res) => {
  const since = req.query.since; // timestamp
  const donations = readDonations();
  
  if (since) {
    const sinceDate = new Date(parseInt(since));
    const newDonations = donations.filter(d => new Date(d.time) > sinceDate);
    return res.json({ donations: newDonations, serverTime: Date.now() });
  }
  
  res.json({ donations: donations.slice(0, 50), serverTime: Date.now() });
});

// POST /donations - Thêm donation mới (admin hoặc test)
app.post('/donations', (req, res) => {
  const { name, amount, message } = req.body;
  
  if (!name || !amount) {
    return res.status(400).json({ error: 'Missing name or amount' });
  }
  
  const donations = readDonations();
  const newDonation = {
    id: uuidv4(),
    name: String(name).trim(),
    amount: parseInt(amount),
    message: String(message || '').trim().substring(0, 500),
    time: new Date().toISOString(),
    status: 'completed'
  };
  
  donations.unshift(newDonation);
  writeDonations(donations);
  
  res.json({ success: true, donation: newDonation });
});

// POST /webhook/vietqr - Webhook từ VietQR
app.post('/webhook/vietqr', (req, res) => {
  const { amount, senderName, description, timestamp, transactionId } = req.body;
  
  console.log('=== VietQR Webhook Received ===');
  console.log({ amount, senderName, description, timestamp, transactionId });
  
  // Validate required fields
  if (!amount || !transactionId) {
    console.log('Missing required fields');
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Kiểm tra transaction đã được xử lý chưa (idempotency)
  const donations = readDonations();
  const existing = donations.find(d => d.transactionId === transactionId);
  if (existing) {
    console.log('Transaction already processed:', transactionId);
    return res.json({ success: true, message: 'Already processed' });
  }
  
  // Parse tên từ description hoặc senderName
  let name = senderName || 'Khach';
  if (description) {
    // VietQR description format: "Tang [Tên] [Số tiền]"
    const match = description.match(/Tang\s+(.+?)(?:\s+\d+|$)/i);
    if (match) name = match[1].trim();
  }
  
  // Parse message từ description
  let message = '';
  if (description) {
    // Format: "Tang minh 50000 Chúc mừng sinh nhật"
    const parts = description.split(/\s+/);
    // Lấy phần sau số tiền làm message
    const amountIndex = parts.findIndex(p => p === String(amount) || p === String(parseInt(amount)));
    if (amountIndex !== -1 && parts[amountIndex + 1]) {
      message = parts.slice(amountIndex + 1).join(' ').substring(0, 500);
    }
  }
  
  // Tạo donation
  const newDonation = {
    id: uuidv4(),
    name: name.substring(0, 50),
    amount: parseInt(amount),
    message: message,
    time: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
    transactionId: transactionId,
    source: 'vietqr',
    status: 'completed'
  };
  
  donations.unshift(newDonation);
  writeDonations(donations);
  
  console.log('Donation saved:', newDonation);
  res.json({ success: true, donation: newDonation });
});

// POST /webhook/mock - Mock webhook để test (không cần tài khoản VietQR)
app.post('/webhook/mock', (req, res) => {
  const { name, amount, message } = req.body;
  
  console.log('=== Mock Webhook (TEST) ===');
  console.log({ name, amount, message });
  
  if (!name || !amount) {
    return res.status(400).json({ error: 'Missing name or amount' });
  }
  
  const donations = readDonations();
  const newDonation = {
    id: uuidv4(),
    name: String(name).trim().substring(0, 50),
    amount: parseInt(amount),
    message: String(message || '').trim().substring(0, 500),
    time: new Date().toISOString(),
    transactionId: 'mock_' + Date.now(),
    source: 'mock',
    status: 'completed'
  };
  
  donations.unshift(newDonation);
  writeDonations(donations);
  
  console.log('Mock donation saved:', newDonation);
  res.json({ success: true, donation: newDonation });
});

// DELETE /donations/:id - Xóa donation
app.delete('/donations/:id', (req, res) => {
  const { id } = req.params;
  let donations = readDonations();
  const index = donations.findIndex(d => d.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Donation not found' });
  }
  
  donations.splice(index, 1);
  writeDonations(donations);
  
  res.json({ success: true });
});

// GET /stats - Thống kê
app.get('/stats', (req, res) => {
  const donations = readDonations();
  const total = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  const count = donations.length;
  const uniqueDonors = [...new Set(donations.map(d => d.name))].length;
  
  // Top donors
  const totals = {};
  donations.forEach(d => {
    totals[d.name] = (totals[d.name] || 0) + d.amount;
  });
  const topDonors = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, total]) => ({ name, total }));
  
  res.json({
    totalAmount: total,
    totalCount: count,
    uniqueDonors: uniqueDonors,
    topDonors: topDonors
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Bio Donation Backend Server                             ║
║  Running on http://localhost:${PORT}                        ║
╠═══════════════════════════════════════════════════════════╣
║  Endpoints:                                             ║
║  GET  /donations          - Danh sách donations          ║
║  GET  /donations/latest   - Donations mới (polling)      ║
║  POST /donations          - Thêm donation (admin)         ║
║  POST /webhook/vietqr     - VietQR webhook               ║
║  POST /webhook/mock       - Mock test webhook             ║
║  GET  /stats              - Thống kê                    ║
║  GET  /health             - Health check                 ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
