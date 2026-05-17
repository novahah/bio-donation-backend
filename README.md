# Bio Donation Backend

Backend server cho hệ thống bio donation với hỗ trợ VietQR webhook.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/donations` | Lấy danh sách tất cả donations |
| GET | `/donations/latest?since=timestamp` | Lấy donations mới từ timestamp |
| POST | `/donations` | Thêm donation mới |
| POST | `/webhook/vietqr` | VietQR webhook endpoint |
| POST | `/webhook/mock` | Mock webhook để test |
| DELETE | `/donations/:id` | Xóa donation |
| GET | `/stats` | Thống kê donations |
| GET | `/health` | Health check |

## Setup

```bash
cd backend
npm install
npm start
```

Server chạy trên `http://localhost:3000`

## Test Webhook

```bash
# Test mock donation
curl -X POST http://localhost:3000/webhook/mock \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "amount": 50000, "message": "Chúc mừng sinh nhật!"}'
```

## Deploy lên Railway (Miễn phí)

1. Push code lên GitHub
2. Connect Railway với GitHub repo
3. Railway tự nhận diện Node.js và deploy

## VietQR Integration

Để nhận webhook thật từ VietQR:
1. Đăng ký tài khoản VietQR Merchant
2. Cấu hình callback URL: `https://your-app.railway.app/webhook/vietqr`
3. VietQR sẽ gửi POST request khi có thanh toán

## Response Format

```json
// GET /donations
[
  {
    "id": "uuid",
    "name": "Nguyen Van A",
    "amount": 50000,
    "message": "Chúc mừng sinh nhật!",
    "time": "2026-05-17T10:30:00.000Z",
    "transactionId": "vietqr_xxx",
    "source": "vietqr",
    "status": "completed"
  }
]
```
