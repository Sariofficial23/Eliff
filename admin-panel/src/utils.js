export const formatPrice = (n) =>
  Number(n || 0).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";

export const formatDate = (d) =>
  new Date(d).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// Faylni brauzerда siqib, kichik JPEG (data URL) ga aylantiramiz.
// Shu ko'rinishда bazaga saqlanadi — alohida fayl xotirasi kerak emas.
export const fileToCompressedDataUrl = (file, maxSize = 800, quality = 0.72) =>
  new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Bu rasm fayli emas'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Faylni o‘qib bo‘lmadi'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Rasmni ochib bo‘lmadi'));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
