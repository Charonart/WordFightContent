const { contextBridge, ipcRenderer } = require("electron");

// Cung cấp các API hệ thống an toàn cho giao diện ứng dụng WordFight
contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  // Lưu bộ ảnh trực tiếp vào thư mục trên máy tính (không cần nén rar/zip)
  saveImagesToFolder: (payload) => ipcRenderer.invoke("save-images-to-folder", payload),
  // Mở thư mục đã lưu trong Windows File Explorer
  openFolder: (folderPath) => ipcRenderer.invoke("open-folder", folderPath),
});
