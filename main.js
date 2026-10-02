const { app, BrowserWindow, Menu, MenuItem } = require("electron");
const path = require("path");
const fs = require("fs");

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
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
    },
  });

  // Tạo menu ứng dụng hỗ trợ đầy đủ phím tắt chuẩn: Undo, Redo, Cut, Copy, Paste, Select All
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
      contextMenu.append(new MenuItem({ type: "separator" }));
      contextMenu.append(new MenuItem({ label: "Chọn tất cả (Select All)", role: "selectAll" }));
      contextMenu.popup({ window: win });
    } else if (params.selectionText && params.selectionText.trim().length > 0) {
      contextMenu.append(new MenuItem({ label: "Sao chép (Copy)", role: "copy" }));
      contextMenu.popup({ window: win });
    }
  });

  // Mở file index.html làm màn hình chính
  win.loadFile("index.html");
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
