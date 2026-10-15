const { app, BrowserWindow, Menu, MenuItem, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");

// Tắt Hardware Acceleration để sửa triệt để lỗi GPU state invalid làm mất con trỏ chuột (caret) và không thể click/gõ phím vào các ô input trên Windows
app.disableHardwareAcceleration();

function createWindow() {
  const iconPath = fs.existsSync(path.join(__dirname, "icon.ico"))
    ? path.join(__dirname, "icon.ico")
    : path.join(__dirname, "logo.png");

  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 650,
    icon: iconPath,
    show: false, // Ẩn lúc khởi tạo, chờ sẵn sàng để show và focus chuẩn xác
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
      spellcheck: false, // Tắt spellcheck Chromium để tránh xung đột với bộ gõ tiếng Việt (UniKey, EVKey)
    },
  });

  // Tạo menu ứng dụng hỗ trợ đầy đủ phím tắt chuẩn: Undo, Redo, Cut, Copy, Paste, Delete, Select All
  const menuTemplate = [
    {
      label: "Edit",
      submenu: [
        { label: "Hoàn tác (Undo)", accelerator: "CmdOrCtrl+Z", role: "undo" },
        { label: "Làm lại (Redo)", accelerator: "Shift+CmdOrCtrl+Z", role: "redo" },
        { type: "separator" },
        { label: "Cắt (Cut)", accelerator: "CmdOrCtrl+X", role: "cut" },
        { label: "Sao chép (Copy)", accelerator: "CmdOrCtrl+C", role: "copy" },
        { label: "Dán (Paste)", accelerator: "CmdOrCtrl+V", role: "paste" },
        { label: "Xóa (Delete)", role: "delete" },
        { type: "separator" },
        { label: "Chọn tất cả (Select All)", accelerator: "CmdOrCtrl+A", role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Tải lại (Reload)", accelerator: "CmdOrCtrl+R", role: "reload" },
        { label: "Tải lại cưỡng bức", accelerator: "Shift+CmdOrCtrl+R", role: "forceReload" },
        { label: "Công cụ nhà phát triển (DevTools)", accelerator: "F12", role: "toggleDevTools" },
        { type: "separator" },
        { label: "Phóng to", accelerator: "CmdOrCtrl+Plus", role: "zoomIn" },
        { label: "Thu nhỏ", accelerator: "CmdOrCtrl+-", role: "zoomOut" },
        { label: "Cỡ chữ mặc định", accelerator: "CmdOrCtrl+0", role: "resetZoom" },
        { type: "separator" },
        { label: "Toàn màn hình", accelerator: "F11", role: "togglefullscreen" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Ẩn thanh menu mặc định trên thanh tiêu đề để giao diện tối giản, hiện đại
  win.setMenuBarVisibility(false);

  // Chặn phím Alt đơn lẻ kích hoạt Menu Bar ẩn làm mất tiêu điểm (focus) ô input trên Windows
  win.webContents.on("before-input-event", (event, input) => {
    if (input.key === "Alt" && input.type === "keyDown" && !input.control && !input.shift && !input.meta) {
      event.preventDefault();
    }
  });

  // Hỗ trợ Menu chuột phải (Context Menu) cho các ô nhập văn bản (Copy, Paste, Cut, Select All)
  win.webContents.on("context-menu", (event, params) => {
    const contextMenu = new Menu();
    if (params.isEditable) {
      contextMenu.append(new MenuItem({ label: "Hoàn tác (Undo)", role: "undo" }));
      contextMenu.append(new MenuItem({ label: "Làm lại (Redo)", role: "redo" }));
      contextMenu.append(new MenuItem({ type: "separator" }));
      contextMenu.append(new MenuItem({ label: "Cắt (Cut)", role: "cut" }));
      contextMenu.append(new MenuItem({ label: "Sao chép (Copy)", role: "copy" }));
      contextMenu.append(new MenuItem({ label: "Dán (Paste)", role: "paste" }));
      contextMenu.append(new MenuItem({ label: "Xóa (Delete)", role: "delete" }));
      contextMenu.append(new MenuItem({ type: "separator" }));
      contextMenu.append(new MenuItem({ label: "Chọn tất cả (Select All)", role: "selectAll" }));
      contextMenu.popup({ window: win });
    } else if (params.selectionText && params.selectionText.trim().length > 0) {
      contextMenu.append(new MenuItem({ label: "Sao chép (Copy)", role: "copy" }));
      contextMenu.popup({ window: win });
    }
  });

  // Khi cửa sổ sẵn sàng hiển thị, đảm bảo show và kích hoạt focus trực tiếp vào webContents
  win.once("ready-to-show", () => {
    win.show();
    win.focus();
    win.webContents.focus();
  });

  // Khi người dùng click lại vào cửa sổ ứng dụng, tự động focus lại webContents
  win.on("focus", () => {
    win.webContents.focus();
  });

  // Mở file index.html làm màn hình chính
  win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Xử lý lưu toàn bộ ảnh trực tiếp vào thư mục (thay thế nén rar/zip)
ipcMain.handle("save-images-to-folder", async (event, { folderName, files }) => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const { canceled, filePaths } = await dialog.showOpenDialog(focusedWindow, {
    title: "Chọn thư mục để lưu bộ ảnh WordFight",
    properties: ["openDirectory", "createDirectory"],
    buttonLabel: "Lưu vào thư mục này",
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return { success: false, canceled: true };
  }

  const selectedDir = filePaths[0];
  const safeFolderName = (folderName || "WordFight_Images")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();
  const targetDir = path.join(selectedDir, safeFolderName);

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    for (const file of files) {
      const safeFileName = file.name.replace(/[\\/:*?"<>|]/g, "_");
      const filePath = path.join(targetDir, safeFileName);
      let buffer;
      if (file.buffer) {
        buffer = Buffer.from(file.buffer);
      } else if (file.base64) {
        buffer = Buffer.from(file.base64, "base64");
      }
      if (buffer) {
        await fs.promises.writeFile(filePath, buffer);
      }
    }

    // Tự động mở thư mục trong Windows File Explorer sau khi lưu xong
    shell.openPath(targetDir);

    return {
      success: true,
      folderPath: targetDir,
      fileCount: files.length,
    };
  } catch (err) {
    console.error("Lỗi khi lưu ảnh vào thư mục:", err);
    return {
      success: false,
      error: err.message,
    };
  }
});

ipcMain.handle("open-folder", async (event, folderPath) => {
  if (folderPath && fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
    return true;
  }
  return false;
});

