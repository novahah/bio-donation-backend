# Deploy Script - Chạy script này để push code lên GitHub

# 1. Thay YOUR_USERNAME bằng username GitHub của bạn
$githubUsername = "YOUR_USERNAME"
$repoName = "bio-donation-backend"

# 2. Di chuyển vào thư mục backend
Set-Location "d:\new bio\backend"

# 3. Commit tất cả thay đổi
git add .
git commit -m "Initial commit - Bio Donation Backend"

# 4. Thêm remote origin
git remote add origin "https://github.com/$githubUsername/$repoName.git"

# 5. Push lên GitHub
git branch -M main
git push -u origin main

Write-Host ""
Write-Host "=== Done! ==="
Write-Host "1. Vao https://github.com/$githubUsername/$repoName"
Write-Host "2. Tao repo moi tren GitHub neu chua co"
Write-Host "3. Quay lai Railway de deploy"
