# Khám phá Hình học Không gian 3D — Bài 13. Hai mặt phẳng song song (Toán 11)

Phòng thí nghiệm hình học không gian 3D & AR tĩnh (React + TypeScript + Vite + Three.js), phục vụ hoạt động nhóm và trình chiếu trong tiết hội giảng Toán 11.

**Phát triển bởi:** PHAN THỊ NGỌC THÁI — Giáo viên Toán THPT – Trường THPT số 1 Trần Cao Vân.

## Tính năng chính

- **Mô hình chuẩn toán học**: Đọc dữ liệu từ `/models/Hinh_chop_SABCD_trung_diem_MNP.json` theo định dạng `HH-3D-JSON` và kiểm định tự động bằng vectơ ($A+C=B+D$, trung điểm $M, N, P$, quan hệ song song $MN \parallel AB$, $NP \parallel BC$, $MP \parallel AC$, $(MNP) \parallel (ABCD)$).
- **Tương tác 3D & góc nhìn chuẩn**: Xoay 360° bằng cảm ứng, phóng to/thu nhỏ, tự động xoay 3D, góc nhìn Trên/Trước/Bên/Khôi phục, lưới tọa độ bật/tắt, chế độ toàn màn hình và chụp ảnh kèm nhãn đỉnh.
- **Thuật toán nét thấy / nét khuất động**: Tính toán che khuất thực sự bằng phép chiếu tia đối với các mặt thực (`solid_face`), kèm công tắc bật/tắt chế độ nét khuất động.
- **Chế độ Học sinh & Giáo viên**:
  - *Học sinh*: **Thử thách hình học 3D** 4 bước (Dự đoán → Kiểm chứng → Khám phá song song → Hoàn thiện chứng minh có gợi ý và nút xem lời giải chủ động).
  - *Giáo viên*: Bật/tắt đáp án, hiển thị lần lượt các đoạn $MN, NP, MP$, trình chiếu toàn màn hình.
- **Chia sẻ bằng mã QR thực tế & AR**: Tạo mã QR trực tiếp từ URL ứng dụng đang chạy; hỗ trợ WebXR `immersive-ar` (có chỉnh kích thước & góc xoay trên mặt bàn), Apple AR Quick Look (`.usdz`), và tải `.glb`.

## Cấu trúc thư mục

```text
/
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json
├── public/
│   └── models/
│       └── Hinh_chop_SABCD_trung_diem_MNP.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles.css
│   ├── components/
│   │   ├── GeometryViewer.tsx
│   │   ├── GeometryControls.tsx
│   │   └── ARViewer.tsx
│   └── geometry/
│       ├── parseGeometry.ts
│       ├── buildPyramid.ts
│       └── visibility.ts
└── README.md
```

## Chạy và kiểm tra cục bộ

Yêu cầu: Node.js >= 20 và npm.

```bash
npm ci
npm run dev
```

Kiểm tra TypeScript và đóng gói bản production:

```bash
npm run build
npm run preview
```

## Hướng dẫn đưa lên GitHub và triển khai Vercel

1. **Đưa mã nguồn lên GitHub**:
   - Đảm bảo không đưa `node_modules/` và `dist/` lên Git (đã cấu hình trong `.gitignore`).
   - Đảm bảo giữ tệp `package-lock.json` và `public/models/Hinh_chop_SABCD_trung_diem_MNP.json`.
   - Khởi tạo git và đẩy lên repository GitHub:
     ```bash
     git init
     git add .
     git commit -m "Initial commit: Kham pha Hinh chop 3D"
     git branch -M main
     git remote add origin <URL_REPO_GITHUB_CUA_BAN>
     git push -u origin main
     ```

2. **Triển khai trên Vercel**:
   - Đăng nhập [Vercel](https://vercel.com), chọn **Add New... -> Project** và kết nối repository GitHub vừa tạo.
   - Kiểm tra cấu hình dự án trên Vercel (hoặc để Vercel tự nhận theo `vercel.json`):
     - **Framework Preset**: `Vite`
     - **Root Directory**: `./` (thư mục gốc chứa `package.json`)
     - **Install Command**: `npm ci`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
   - Nhấn **Deploy**.

3. **Sử dụng trong lớp học bằng mã QR**:
   - Sau khi Vercel triển khai xong, sao chép URL HTTPS (ví dụ `https://ten-du-an.vercel.app`) để tạo mã QR cho 4 nhóm học sinh quét trên điện thoại.
   - Kiểm tra nhanh trên bản production:
     - Truy cập URL qua HTTPS.
     - Kiểm tra `/models/Hinh_chop_SABCD_trung_diem_MNP.json` tải thành công (HTTP 200).
     - Xoay/thu phóng trên điện thoại Android Chrome và iPhone Safari ở cả màn hình dọc và ngang.
     - Nếu thiết bị không hỗ trợ AR, chế độ 3D thông thường vẫn hoạt động đầy đủ.
