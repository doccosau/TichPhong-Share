import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isPermissionGranted, requestPermission, sendNotification, onAction } from '@tauri-apps/plugin-notification';
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, Laptop, Settings, Send, Download, Monitor, CheckCircle, XCircle, FileIcon, FolderOpen, FileText, QrCode, HardDrive, Globe, Link2, Copy, Power, Wifi, Info, BookOpen, Languages, Heart, RefreshCw } from "lucide-react";
import QRCode from "react-qr-code";
import "./App.css";

type Device = {
  id: string;
  name: string;
  device_type: string;
  ip: string;
  port: number;
};

type FileRequest = {
  id: string;
  fileName: string;
  size: number;
  fileType: string;
};

type ReceiveSession = {
  sessionId: string;
  sender: string;
  files: Record<string, FileRequest>;
};

type ShareSettings = {
  alias: string;
  fingerprint: string;
  download_dir: string;
  language?: 'vi' | 'en';
  theme?: 'dark' | 'light';
  accent?: 'jade' | 'mystic' | 'cinnabar' | 'purple' | 'tet' | 'zen';
};

// QUICK SHARE TYPES
type QSState = "Initial" | "ReceivedConnectionRequest" | "WaitingForUserConsent" | "ReceivingFiles" | "SendingFiles" | "Finished" | "Disconnected" | "Rejected" | "Cancelled" | "SentConnectionResponse" | "SentUkeyClientInit" | "SentUkeyClientFinish" | "SentPairedKeyEncryption" | "SentPairedKeyResult" | "SentIntroduction";
type QSChannelMessage = {
  id: string;
  direction: "FrontToLib" | "LibToFront";
  rtype?: "Inbound" | "Outbound";
  state?: QSState;
  meta?: {
    id: string;
    source?: { name: string; device_type?: string; id: string };
    pin_code?: string;
    files?: string[];
    text_payload?: string;
    total_bytes: number;
    ack_bytes: number;
  };
};

const getQSStateText = (state: string, isOutbound?: boolean) => {
  switch(state) {
    case "Initial": return isOutbound ? "Đang kết nối đến thiết bị..." : "Đang khởi tạo...";
    case "ReceivedConnectionRequest": return "Đang yêu cầu kết nối...";
    case "WaitingForUserConsent": return isOutbound ? "Đang chờ thiết bị nhận chấp nhận..." : "Đang chờ xác nhận mã PIN";
    case "ReceivingFiles": return "Đang nhận file...";
    case "SendingFiles": return "Đang gửi file...";
    case "Finished": return "Đã hoàn tất!";
    case "Disconnected": return "Đã ngắt kết nối";
    case "Rejected": return isOutbound ? "Thiết bị nhận đã từ chối" : "Đã từ chối";
    case "Cancelled": return "Đã huỷ";
    case "SentConnectionResponse": return "Đang thiết lập bảo mật...";
    case "SentUkeyClientInit": return "Đang trao đổi khóa bảo mật...";
    case "SentUkeyClientFinish": return "Đang hoàn tất mã hoá...";
    case "SentPairedKeyEncryption": return "Đang xác thực ghép nối...";
    case "SentPairedKeyResult": return "Đang chuẩn bị danh sách file...";
    case "SentIntroduction": return "Đang chờ thiết bị nhận chấp thuận...";
    default: return state;
  }
};

function App() {
  const [activeTab, setActiveTab] = useState<"send" | "receive" | "settings" | "portal" | "about">("send");
  const [devices, setDevices] = useState<Device[]>([]);
  const [localIp, setLocalIp] = useState("Đang tải...");
  
  // QuickShare State
  const [qsTransfer, setQsTransfer] = useState<QSChannelMessage | null>(null);
  
  // Send state
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  type TransferState = {
    status: 'waiting' | 'sending' | 'success' | 'error';
    device: string;
    message?: string;
    progress?: number;
    sent?: number;
    total?: number;
    files?: string[];
  };
  const [transfer, setTransfer] = useState<TransferState | null>(null);
  const [sentHistory, setSentHistory] = useState<{name: string, device: string, time: string}[]>([]);
  
  const [pendingReceives, setPendingReceives] = useState<ReceiveSession[]>([]);
  
  type ReceiveProgress = {
    fileName: string;
    progress: number;
    received: number;
    total: number;
  };
  const [receiveProgresses, setReceiveProgresses] = useState<Record<string, ReceiveProgress>>({});
  
  const [receivedHistory, setReceivedHistory] = useState<{name: string, device: string, time: string}[]>([]);
  
  // Settings
  const [settings, setSettings] = useState<ShareSettings>({
    alias: "Đang tải...",
    fingerprint: "...",
    download_dir: "~/Downloads/TichPhongShare",
    language: "vi",
    theme: "light",
    accent: "jade"
  });

  // Nhac-Quan Exact Accents Mapping with Light Background Tints
  const ACCENT_COLORS: Record<string, { main: string; hover: string; bgLight: string }> = {
    mystic: { main: '#3D8F8F', hover: '#2B7575', bgLight: '#faf8f3' }, // Warm Cream
    jade: { main: '#047857', hover: '#065f46', bgLight: '#ecfdf5' }, // Emerald 50
    cinnabar: { main: '#b91c1c', hover: '#991b1b', bgLight: '#fef2f2' }, // Red 50
    purple: { main: '#8b5cf6', hover: '#7c3aed', bgLight: '#faf5ff' }, // Purple 50
    tet: { main: '#991b1b', hover: '#7f1d1d', bgLight: '#fffbeb' }, // Amber 50
    zen: { main: '#525252', hover: '#404040', bgLight: '#fafaf9' } // Stone 50
  };

  useEffect(() => {
    // Apply selected Nhac-Quan Accent
    const accent = ACCENT_COLORS[settings.accent || 'mystic'] || ACCENT_COLORS.mystic;
    document.documentElement.style.setProperty('--tp-accent', accent.main);
    document.documentElement.style.setProperty('--tp-accent-hover', accent.hover);

    if (settings.theme === 'light') {
      document.documentElement.style.setProperty('--tp-bg', accent.bgLight); // Dynamically tinted background
      document.documentElement.style.setProperty('--tp-surface', 'hsl(0, 0%, 100%)'); // Nhac-Quan Card #ffffff
      document.documentElement.style.setProperty('--tp-border', 'hsl(214.3, 31.8%, 91.4%)'); // Nhac-Quan Border #e2e8f0
      
      document.documentElement.style.setProperty('--color-white', 'hsl(0, 0%, 17%)'); // Nhac-Quan Foreground #2c2c2c
      document.documentElement.style.setProperty('--color-black', 'hsl(0, 0%, 100%)'); // Pure white
      document.documentElement.style.setProperty('--color-gray-400', 'hsl(215.4, 16.3%, 46.9%)'); // Nhac-Quan Muted #64748b
      document.documentElement.style.setProperty('--color-gray-500', 'hsl(215.4, 16.3%, 46.9%)'); 
      document.documentElement.className = 'theme-light';
    } else {
      document.documentElement.style.setProperty('--tp-bg', 'hsl(222.2, 84%, 4.9%)'); // Nhac-Quan Dark Background #020617
      document.documentElement.style.setProperty('--tp-surface', 'hsl(222.2, 84%, 4.9%)'); // Nhac-Quan Dark Card #020617
      document.documentElement.style.setProperty('--tp-border', 'hsl(217.2, 32.6%, 17.5%)'); // Nhac-Quan Dark Border #1e293b
      
      document.documentElement.style.removeProperty('--color-white');
      document.documentElement.style.removeProperty('--color-black');
      document.documentElement.style.removeProperty('--color-gray-400');
      document.documentElement.style.removeProperty('--color-gray-500');
      document.documentElement.className = 'theme-dark';
    }
  }, [settings.accent, settings.theme]);
  
  // Portal State
  const [ftpAddress, setFtpAddress] = useState("");
  const [webdavStatus, setWebdavStatus] = useState(false);
  const [webshareStatus, setWebshareStatus] = useState(false);
  const [websharePort, setWebsharePort] = useState(8081);
  const [showGuide, setShowGuide] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'latest' | 'error'>('idle');
  const [latestVersion, setLatestVersion] = useState('');
  const [releaseUrl, setReleaseUrl] = useState('');

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    try {
      const { getVersion } = await import('@tauri-apps/api/app');
      const currentVersion = await getVersion();
      const res = await fetch("https://api.github.com/repos/doccosau/TichPhong-Share/releases/latest");
      if (!res.ok) throw new Error("Failed to fetch update");
      const data = await res.json();
      const latest = data.tag_name.replace('v', '');
      if (latest !== currentVersion && data.html_url) {
        setLatestVersion(latest);
        setReleaseUrl(data.html_url);
        setUpdateStatus('available');
      } else {
        setUpdateStatus('latest');
        setTimeout(() => setUpdateStatus('idle'), 3000);
      }
    } catch (e) {
      console.error("Update check failed:", e);
      setUpdateStatus('error');
      setTimeout(() => setUpdateStatus('idle'), 3000);
    }
  };

  const t = (vi: string, en: string) => settings.language === 'en' ? en : vi;

  useEffect(() => {
    invoke<string>("get_local_ip")
      .then(ip => setLocalIp(ip))
      .catch(console.error);
  }, []);

  const triggerOSNotification = async (title: string, body: string) => {
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      if (permissionGranted) {
        sendNotification({ title, body, id: 1 });
      }
    } catch (e) {
      console.error("Failed to send notification:", e);
    }
  };

  useEffect(() => {
    onAction(async () => {
      try {
        const win = getCurrentWindow();
        await win.unminimize();
        await win.show();
        await win.setFocus();
      } catch (e) {
        console.error(e);
      }
    });
    async function fetchInfo() {
      try {
        const ip = await invoke<string>("get_local_ip");
        setLocalIp(ip);
        const st = await invoke<ShareSettings>("get_settings");
        setSettings(st);
      } catch (e) {
        setLocalIp("127.0.0.1");
      }
    }
    fetchInfo();
    
    invoke<string[]>("get_cli_args").then(args => {
      if (args && args.length > 0) {
        setSelectedFiles(prev => {
          const uniqueFiles = new Set([...prev, ...args]);
          return Array.from(uniqueFiles);
        });
        setActiveTab("send");
      }
    }).catch(console.error);
    
    const unlistenOpenFiles = listen<string[]>("open-files", (event) => {
      if (event.payload && event.payload.length > 0) {
        setSelectedFiles(prev => {
          const uniqueFiles = new Set([...prev, ...event.payload]);
          return Array.from(uniqueFiles);
        });
        setActiveTab("send");
      }
    });
    
    // Support Drag and Drop
    const unlistenFileDrop = listen<{ paths: string[] }>("tauri://file-drop", (event) => {
      if (event.payload.paths && event.payload.paths.length > 0) {
        setSelectedFiles(prev => Array.from(new Set([...prev, ...event.payload.paths])));
        setActiveTab("send");
      }
    });
    
    // Tauri v2 drop event alternative
    const unlistenDrop = listen<{ paths: string[] }>("tauri://drop", (event) => {
      if (event.payload.paths && event.payload.paths.length > 0) {
        setSelectedFiles(prev => Array.from(new Set([...prev, ...event.payload.paths])));
        setActiveTab("send");
      }
    });

    const unlistenNavigateTab = listen<string>("navigate_tab", (event) => {
      if (["send", "receive", "portal", "settings", "about"].includes(event.payload)) {
        setActiveTab(event.payload as any);
      }
    });
    
    // QUICK SHARE
    const unlistenQuickShare = listen<QSChannelMessage>("quickshare-event", async (event) => {
      const msg = event.payload;
      console.log("QUICKSHARE EVENT:", msg);
      
      // Update state IMMEDIATELY so the UI renders
      setQsTransfer(msg);
      
      // Focus window for consent (inbound only)
      if (msg.state === "WaitingForUserConsent" && msg.rtype !== "Outbound") {
        try {
          const win = getCurrentWindow();
          await win.unminimize();
          await win.show();
          await win.setAlwaysOnTop(true);
          await win.setFocus();
          setTimeout(() => win.setAlwaysOnTop(false), 500);
        } catch (e) {
          console.error("Window focus failed on Wayland:", e);
        }
        
        triggerOSNotification(
          "Nhận File qua Quick Share", 
          `Mã PIN: ${msg.meta?.pin_code || "Không có mã"}. Nhấn để xác nhận!`
        );
      }
      
      // Auto dismiss complete/failed after 5s
      if (msg.state === "Finished" || msg.state === "Disconnected" || msg.state === "Cancelled" || msg.state === "Rejected") {
        if (msg.state === "Finished" && msg.meta) {
          const deviceName = msg.meta.source?.name || "Thiết bị (Quick Share)";
          const time = new Date().toLocaleTimeString();
          const isOutbound = msg.rtype === "Outbound";
          
          if (isOutbound) {
            // Outbound: record sent history
            const metaFiles = msg.meta.files;
            if (metaFiles && metaFiles.length > 0) {
              setSentHistory(prev => [
                ...metaFiles.map((f: string) => ({ name: f.split(/(\\|\/)/g).pop() || f, device: deviceName, time })),
                ...prev
              ]);
            }
            setSelectedFiles([]);
          } else {
            // Inbound: record received history
            const metaFiles = msg.meta.files;
            const textPayload = msg.meta.text_payload;
            
            if (metaFiles && metaFiles.length > 0) {
              setReceivedHistory(prev => [
                ...metaFiles.map((f: string) => ({ name: f, device: deviceName, time })),
                ...prev
              ]);
            } else if (textPayload) {
              setReceivedHistory(prev => [
                { name: "Đoạn văn bản / URL", device: deviceName, time },
                ...prev
              ]);
            }
          }
        }
        
        // Notify on outbound failure
        if (msg.state === "Rejected" && msg.rtype === "Outbound") {
          triggerOSNotification("Quick Share", "Thiết bị nhận đã từ chối file của bạn.");
        }
        
        setTimeout(() => {
          setQsTransfer(null);
        }, 5000);
      }
    });

    const unlistenMdns = listen<Device>("device-found", (event) => {
      setDevices(prev => {
        if (prev.some(d => d.id === event.payload.id)) return prev;
        return [...prev, event.payload];
      });
    });

    const unlistenReceiveReq = listen<ReceiveSession>("receive-request", async (event) => {
      setPendingReceives(prev => [...prev, event.payload]);
      // Auto switch to receive tab to alert user
      setActiveTab("receive");
      
      try {
        const win = getCurrentWindow();
        await win.unminimize();
        await win.show();
        await win.setAlwaysOnTop(true);
        await win.setFocus();
        setTimeout(() => win.setAlwaysOnTop(false), 500);
      } catch (e) {
        console.error(e);
      }
      
      triggerOSNotification(
        "Nhận File qua TichPhong Share", 
        `${event.payload.files.length} file đang chờ xác nhận từ thiết bị khác!`
      );
    });
    
    const unlistenFileReceived = listen<any>("file-received", (event) => {
      setReceivedHistory(prev => [{
        name: event.payload.name, 
        device: event.payload.device, 
        time: event.payload.time
      }, ...prev]);
      setReceiveProgresses(prev => {
        const copy = { ...prev };
        delete copy[event.payload.name];
        return copy;
      });
    });
    
    const unlistenReceiveProgress = listen<any>("receive-progress", (event) => {
      setReceiveProgresses(prev => ({
        ...prev,
        [event.payload.fileName]: event.payload
      }));
    });
    
    const unlistenSendProgress = listen<any>("send-progress", (event) => {
      setTransfer(prev => prev ? { 
        ...prev, 
        status: event.payload.status || 'sending', 
        progress: event.payload.progress,
        sent: event.payload.sent,
        total: event.payload.total,
        message: "Đang truyền tải dữ liệu..." 
      } : null);
    });
    
    return () => {
      unlistenMdns.then(f => f());
      unlistenReceiveReq.then(f => f());
      unlistenFileReceived.then(f => f());
      unlistenReceiveProgress.then(f => f());
      unlistenSendProgress.then(f => f());
      unlistenOpenFiles.then(f => f());
      unlistenFileDrop.then(f => f());
      unlistenDrop.then(f => f());
      unlistenQuickShare.then(f => f());
      unlistenNavigateTab.then(f => f());
    };
  }, []);
  
  const handleSelectFiles = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const files = await open({ multiple: true, title: 'Chọn file để gửi' });
      if (files) {
        const newFiles = Array.isArray(files) ? (files as string[]) : [files as string];
        setSelectedFiles(prev => {
          const uniqueFiles = new Set([...prev, ...newFiles]);
          return Array.from(uniqueFiles);
        });
      }
    } catch (e) {
      console.error(e);
    }
  };
  
  const handleSelectFolder = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const folder = await open({ directory: true, multiple: false, title: 'Chọn thư mục lưu' });
      if (folder) {
        const newSettings = { ...settings, download_dir: folder as string };
        setSettings(newSettings);
        await invoke("update_settings", { newSettings });
      }
    } catch (e) {
      console.error(e);
    }
  };
  
  const handleSendToDevice = async (device: Device) => {
    if (selectedFiles.length === 0) return;
    
    if (device.device_type === "QuickShare") {
      // Quick Share: kick off the send and let quickshare-event handle UI/progress
      setTransfer({ status: 'waiting', device: device.name, message: `Đang kết nối đến ${device.name} qua Quick Share...`, files: selectedFiles });
      try {
        await invoke("send_quickshare", { id: device.id, name: device.name, ip: device.ip, port: device.port, filePaths: selectedFiles });
        // Transfer is now managed by quickshare-event listener — dismiss the LocalSend overlay
        setTransfer(null);
      } catch (e) {
        setTransfer({ status: 'error', device: device.name, message: String(e), files: selectedFiles });
        setTimeout(() => setTransfer(null), 4000);
      }
      return;
    }
    
    // LocalSend flow
    setTransfer({ status: 'waiting', device: device.name, message: `Đang chờ ${device.name} phản hồi...`, files: selectedFiles });
    try {
      const res = await invoke<string>("send_file", { ip: device.ip, filePaths: selectedFiles });
      setTransfer({ status: 'success', device: device.name, message: res, files: selectedFiles });
      
      const newHistoryEntries = selectedFiles.map(f => ({
          name: f.split(/(\\|\/)/g).pop() || "File",
          device: device.name,
          time: new Date().toLocaleTimeString()
      }));
      setSentHistory(prev => [...newHistoryEntries, ...prev]);
      
      setSelectedFiles([]); 
      setTimeout(() => setTransfer(null), 3000);
    } catch (e) {
      setTransfer({ status: 'error', device: device.name, message: String(e), files: selectedFiles });
      setTimeout(() => setTransfer(null), 4000);
    }
  };
  
  const handleOpenFile = async (fileName: string) => {
    try {
      await invoke("open_received_file", { fileName });
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await invoke("open_received_folder");
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelSend = async () => {
    try {
      await invoke("cancel_send");
      setTransfer(prev => prev ? { ...prev, status: 'error', message: 'Đã hủy gửi' } : null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelReceive = async () => {
    try {
      await invoke("cancel_receive");
      setReceiveProgresses({}); 
    } catch (e) {
      console.error(e);
    }
  };

  const handleAccept = async (sessionId: string) => {
    try {
      await invoke("accept_receive", { sessionId });
      setPendingReceives(prev => prev.filter(r => r.sessionId !== sessionId));
    } catch (e) {
      console.error(e);
    }
  };
  
  const handleReject = async (sessionId: string) => {
    try {
      await invoke("reject_receive", { sessionId });
      setPendingReceives(prev => prev.filter(r => r.sessionId !== sessionId));
    } catch (e) {
      console.error(e);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`h-full w-full flex flex-col font-sans overflow-hidden transition-colors duration-300 bg-tichphong-dark text-white rounded-lg`}>
      {/* Custom Title Bar */}
      <div data-tauri-drag-region className="h-10 shrink-0 w-full flex justify-between items-center bg-tichphong-surface border-b border-tichphong-border select-none relative z-50">
        <div data-tauri-drag-region className="flex items-center gap-2 px-4 h-full cursor-default flex-1">
           <Send className="w-4 h-4 text-tichphong-blue pointer-events-none" />
           <span data-tauri-drag-region className="text-xs font-semibold text-gray-500 uppercase tracking-widest pointer-events-none">TichPhong Share</span>
        </div>
        <div className="flex h-full shrink-0">
          <button onClick={() => getCurrentWindow().minimize()} className="h-full px-4 hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 12 12"><rect fill="currentColor" width="10" height="1" x="1" y="6"></rect></svg>
          </button>
          <button onClick={() => getCurrentWindow().toggleMaximize()} className="h-full px-4 hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 12 12"><rect width="9" height="9" x="1.5" y="1.5" fill="none" stroke="currentColor"></rect></svg>
          </button>
          <button onClick={() => getCurrentWindow().close()} className="h-full px-4 hover:bg-red-500 text-gray-500 dark:text-gray-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 12 12"><path fill="currentColor" d="M11.46.54a.5.5 0 0 0-.71 0L6 5.29 1.25.54a.5.5 0 0 0-.71.71L5.29 6 .54 10.75a.5.5 0 0 0 .71.71L6 6.71l4.75 4.75a.5.5 0 0 0 .71-.71L6.71 6l4.75-4.75a.5.5 0 0 0 0-.71z"></path></svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-tichphong-surface/50 border-r border-tichphong-border flex flex-col p-4 gap-2">
          <button 
            onClick={() => setActiveTab("send")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'send' ? 'bg-tichphong-blue text-[#ffffff] shadow-lg shadow-tichphong-blue/20' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <Send className="w-5 h-5" />
            <span className="font-medium">{t("Gửi File", "Send File")}</span>
          </button>
          <button 
            onClick={() => setActiveTab("receive")}
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'receive' ? 'bg-tichphong-blue text-[#ffffff] shadow-lg shadow-tichphong-blue/20' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5" />
              <span className="font-medium">{t("Nhận File", "Receive File")}</span>
            </div>
            {pendingReceives.length > 0 && (
              <span className="bg-red-500 text-[#ffffff] text-xs font-bold px-2 py-0.5 rounded-full">{pendingReceives.length}</span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab("portal")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'portal' ? 'bg-tichphong-blue text-[#ffffff] shadow-lg shadow-tichphong-blue/20' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <Globe className="w-5 h-5" />
            <span className="font-medium">Device Portal</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-tichphong-blue text-[#ffffff] shadow-lg shadow-tichphong-blue/20' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">{t("Cài đặt", "Settings")}</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("about")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'about' ? 'bg-tichphong-blue text-[#ffffff] shadow-lg shadow-tichphong-blue/20' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <Info className="w-5 h-5" />
            <span className="font-medium">{t("Giới thiệu", "About")}</span>
          </button>
          
          <div className="mt-auto bg-white/5 p-4 rounded-xl border border-white/5">
            <p className="text-xs text-gray-500 mb-1">{t("IP cục bộ", "Local IP")}</p>
            <p className="font-mono text-sm text-tichphong-blue">{localIp}</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={`flex-1 relative overflow-y-auto p-8 bg-gradient-to-br from-tichphong-dark to-tichphong-surface`}>
          
          <AnimatePresence mode="wait">
            {activeTab === "send" && (
              <motion.div key="send" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full gap-8 max-w-4xl mx-auto">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{t("Gửi File", "Send File")}</h1>
                  <p className="text-gray-400">{t("Chọn file và thiết bị trong cùng mạng để gửi.", "Select files and devices on the same network to send.")}</p>
                </div>
                
                {/* File Selection */}
                <div className="flex flex-col gap-4">
                  <div 
                    onClick={handleSelectFiles}
                    className="w-full h-32 border-2 border-dashed border-tichphong-blue/40 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-tichphong-blue/5 hover:border-tichphong-blue transition-all"
                  >
                    <Send className="w-8 h-8 text-gray-500 mb-2" />
                    <p className="font-medium">{t("Nhấn để chọn file cần gửi", "Click to select files to send")}</p>
                  </div>
                  
                  {selectedFiles.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">{t("Đã chọn", "Selected")} ({selectedFiles.length})</h3>
                      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-white/5 p-2.5 rounded-lg border border-white/5">
                            <FileIcon className="w-5 h-5 text-tichphong-blue shrink-0" />
                            <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-medium truncate">{file.split(/(\\|\/)/g).pop()}</p>
                              <p className="text-xs text-gray-500 truncate">{file}</p>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedFiles(prev => prev.filter((_, i) => i !== idx)) }}
                              className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-md transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Devices */}
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    {t("Thiết bị xung quanh", "Nearby Devices")}
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tichphong-blue opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-tichphong-blue"></span>
                    </span>
                  </h2>
                  
                  {devices.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Monitor className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>{t("Đang tìm kiếm thiết bị trong mạng lân cận...", "Searching for nearby devices...")}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {devices.map(device => (
                        <div 
                          key={device.id} 
                          onClick={() => handleSendToDevice(device)}
                          className={`flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl transition-all ${selectedFiles.length > 0 ? 'cursor-pointer hover:border-tichphong-blue hover:bg-white/10' : 'opacity-50 cursor-not-allowed'}`}
                        >
                          <div className="w-12 h-12 rounded-full bg-tichphong-blue/20 text-tichphong-blue flex items-center justify-center shrink-0">
                            {device.device_type === 'mobile' || device.device_type === 'smartphone' ? <Smartphone className="w-6 h-6" /> : <Laptop className="w-6 h-6" />}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="font-semibold truncate">{device.name}</p>
                            <p className="text-xs text-gray-400">{device.ip}</p>
                          </div>
                          {selectedFiles.length > 0 && (
                            <button className="bg-tichphong-blue text-[#ffffff] px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-tichphong-blue-hover">
                              {t("Gửi", "Send")}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Sent History */}
                {sentHistory.length > 0 && (
                  <div className="mt-4 border-t border-white/10 pt-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-300">{t("Lịch sử gửi", "Sent History")}</h2>
                    <div className="flex flex-col gap-2">
                      {sentHistory.map((item, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/5 rounded-lg p-3 flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-tichphong-blue shrink-0" />
                          <div className="flex-1 overflow-hidden">
                            <p className="truncate font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-gray-500">{t("Gửi đến", "Sent to")} {item.device}</p>
                          </div>
                          <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-md">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "receive" && (
              <motion.div key="receive" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full gap-8 max-w-4xl mx-auto">
                <div className="flex flex-col gap-2">
                  <h1 className="text-3xl font-bold">{t("Nhận File", "Receive File")}</h1>
                  <p className="text-gray-400">{t("Đang lắng nghe yêu cầu gửi file. Máy tính của bạn đã được hiển thị trên mạng LAN.", "Listening for incoming files. Your PC is visible on the local network.")}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 w-fit">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      LocalSend ({t("Nhận đa nền tảng", "Cross-platform receive")})
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 w-fit">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                      Quick Share (Nearby Share)
                    </div>
                  </div>
                </div>
                
                {/* Pending Requests */}
                {pendingReceives.length > 0 && (
                  <div className="bg-tichphong-blue/10 border border-tichphong-blue/30 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold mb-4 text-tichphong-blue">{t("Yêu cầu đến", "Incoming Requests")} ({pendingReceives.length})</h2>
                    <div className="flex flex-col gap-4">
                      {pendingReceives.map(req => (
                        <div key={req.sessionId} className="bg-tichphong-surface border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                          <div className="flex-1 w-full">
                            <p className="font-bold text-lg">{req.sender} <span className="font-normal text-gray-400 text-sm">{t("muốn gửi cho bạn", "wants to send you")}</span></p>
                            <div className="mt-2 flex flex-col gap-1">
                              {Object.values(req.files).map(f => (
                                <p key={f.id} className="text-sm text-gray-300 flex items-center gap-2">
                                  <FileIcon className="w-4 h-4 text-gray-500" />
                                  {f.fileName} <span className="text-gray-500 text-xs">({formatSize(f.size)})</span>
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-3 w-full md:w-auto">
                            <button onClick={() => handleReject(req.sessionId)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg font-medium transition-colors">
                              <XCircle className="w-4 h-4" /> {t("Từ chối", "Decline")}
                            </button>
                            <button onClick={() => handleAccept(req.sessionId)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-tichphong-blue hover:bg-tichphong-blue-hover text-[#ffffff] px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-tichphong-blue/20">
                              <CheckCircle className="w-4 h-4" /> {t("Chấp nhận", "Accept")}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Active Receive Progress */}
                {Object.keys(receiveProgresses).length > 0 && (
                  <div className="bg-tichphong-surface border border-white/10 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-xl font-semibold mb-4 text-tichphong-blue flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-tichphong-blue animate-ping"></div>
                        {t("Đang nhận dữ liệu", "Receiving Data")}
                      </div>
                      <button onClick={handleCancelReceive} className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer font-medium">
                        <XCircle className="w-4 h-4" /> {t("Dừng nhận", "Cancel")}
                      </button>
                    </h2>
                    <div className="flex flex-col gap-4">
                      {Object.values(receiveProgresses).map(prog => (
                        <div key={prog.fileName}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="truncate font-medium">{prog.fileName}</span>
                            <span className="text-tichphong-blue shrink-0">{Math.round(prog.progress)}%</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mb-2 font-medium">
                            <span>{formatSize(prog.received)}</span>
                            <span>{formatSize(prog.total)}</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden border border-white/5">
                            <motion.div 
                              className="bg-gradient-to-r from-tichphong-blue to-cyan-400 h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${prog.progress}%` }}
                              transition={{ ease: "linear", duration: 0.2 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Received History */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-300">{t("Lịch sử nhận", "Received History")} ({receivedHistory.length})</h2>
                    {receivedHistory.length > 0 && (
                      <button onClick={handleOpenFolder} className="text-sm flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors text-white cursor-pointer">
                        <FolderOpen className="w-4 h-4" /> {t("Mở thư mục nhận", "Open Folder")}
                      </button>
                    )}
                  </div>
                  {receivedHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border border-dashed border-white/10 rounded-xl">
                      {t("Chưa có file nào được nhận.", "No files received yet.")}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {receivedHistory.map((item, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/5 rounded-lg p-3 flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                          <div className="flex-1 overflow-hidden">
                            <p className="truncate font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-gray-500">{t("Nhận từ", "Received from")} {item.device} • {item.time}</p>
                          </div>
                          <button onClick={() => handleOpenFile(item.name)} className="bg-tichphong-blue/20 hover:bg-tichphong-blue/40 text-tichphong-blue p-2 rounded-lg transition-colors cursor-pointer" title="Mở file">
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {activeTab === "portal" && (
              <motion.div key="portal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full gap-8 max-w-4xl mx-auto w-full">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Device Portal</h1>
                  <p className="text-gray-400">{t("Biến máy tính thành ổ đĩa mạng và trạm chia sẻ nhanh qua QR Code.", "Turn your PC into a network drive and a quick QR share station.")}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Phone as Drive */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden group hover:border-tichphong-blue/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Smartphone className="w-24 h-24" />
                    </div>
                    <div className="bg-tichphong-blue/20 w-12 h-12 rounded-xl flex items-center justify-center text-tichphong-blue mb-2 relative z-10">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div className="relative z-10">
                      <h2 className="text-xl font-semibold mb-1">{t("Duyệt Điện Thoại", "Browse Phone")}</h2>
                      <p className="text-sm text-gray-400 leading-relaxed">{t("Truy cập bộ nhớ điện thoại qua mạng LAN. Yêu cầu bật tính năng Máy chủ FTP trên điện thoại (có thể sử dụng các ứng dụng như: ShareMe, Xiaomi File Manager hoặc X-plore).", "Access phone storage over LAN. Requires enabling FTP Server on your phone (you can use apps like ShareMe, Xiaomi File Manager, or X-plore).")}</p>
                    </div>
                    <div className="mt-auto flex flex-col gap-3 pt-4 relative z-10">
                      <div className="flex gap-2">
                        <span className="bg-white/10 text-gray-300 text-sm px-3 py-2 rounded-lg border border-white/5 flex items-center justify-center">ftp://</span>
                        <input 
                          type="text" 
                          placeholder="192.168.1.5:2121" 
                          value={ftpAddress}
                          onChange={(e) => setFtpAddress(e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-tichphong-blue transition-colors" 
                        />
                      </div>
                      <button 
                        onClick={() => {
                          if (ftpAddress) {
                            invoke("open_ftp", { ftpUrl: ftpAddress })
                              .catch(err => {
                                console.error(err);
                                alert(t("Không thể mở FTP: ", "Cannot open FTP: ") + err);
                              });
                          }
                        }}
                        className="bg-tichphong-blue hover:bg-tichphong-blue-hover text-[#ffffff] py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Link2 className="w-4 h-4" /> {t("Kết nối", "Connect")}
                      </button>
                    </div>
                  </div>

                  {/* PC as Drive (WebDAV) */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <HardDrive className="w-24 h-24" />
                    </div>
                    <div className="bg-purple-500/20 w-12 h-12 rounded-xl flex items-center justify-center text-purple-400 mb-2 relative z-10">
                      <HardDrive className="w-6 h-6" />
                    </div>
                    <div className="relative z-10">
                      <h2 className="text-xl font-semibold mb-1">{t("Máy Chủ WebDAV", "WebDAV Server")}</h2>
                      <p className="text-sm text-gray-400 leading-relaxed mb-4">{t("Biến PC thành ổ đĩa mạng. Giúp điện thoại truy cập, xem ảnh, copy file từ thư mục PC trực tiếp qua WiFi.", "Turn PC into a network drive. Allows phones to access, view photos, and copy files from PC directly over WiFi.")}</p>
                      
                      {webdavStatus && (
                        <div className="bg-white/5 p-3 rounded-xl border border-white/10 mb-4 flex items-center justify-between">
                          <code className="text-sm text-purple-300">http://{localIp}:8080</code>
                          <button onClick={() => {navigator.clipboard.writeText(`http://${localIp}:8080`)}} className="text-gray-400 hover:text-white"><Copy className="w-4 h-4"/></button>
                        </div>
                      )}
                    </div>
                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5 relative z-10">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t("Trạng thái", "Status")}</span>
                        <span className={`${webdavStatus ? 'text-green-400' : 'text-red-400'} font-medium flex items-center gap-1.5`}><span className={`w-2 h-2 rounded-full ${webdavStatus ? 'bg-green-400' : 'bg-red-400'}`}></span> {webdavStatus ? t('Đang chạy', 'Running') : t('Đã tắt', 'Offline')}</span>
                      </div>
                      <button 
                        onClick={() => {
                          if (!webdavStatus) {
                            invoke("start_webdav").then(() => setWebdavStatus(true)).catch(err => alert(t("Lỗi: ", "Error: ") + err));
                          } else {
                            invoke("stop_webdav").then(() => setWebdavStatus(false)).catch(err => alert(t("Lỗi: ", "Error: ") + err));
                          }
                        }}
                        className={`${webdavStatus ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-purple-500 hover:bg-purple-600 text-[#ffffff]'} px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2`}
                      >
                        <Power className="w-4 h-4" /> {webdavStatus ? t('Tắt Máy Chủ', 'Stop Server') : t('Bật WebDAV', 'Start WebDAV')}
                      </button>
                    </div>
                  </div>

                  {/* WebShare (QR Code) */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 md:col-span-2 relative overflow-hidden group hover:border-green-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Globe className="w-48 h-48" />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 relative z-10">
                      <div className="flex gap-4">
                        <div className="bg-green-500/20 w-12 h-12 rounded-xl flex items-center justify-center text-green-400 shrink-0">
                          <QrCode className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold mb-1">WebShare ({t("Chia sẻ mã QR", "QR Code Sharing")})</h2>
                          <p className="text-sm text-gray-400 leading-relaxed max-w-xl mb-3">{t("Chia sẻ nhanh với thiết bị lạ. Chọn file trên máy tính và quét mã QR để tải ngay trên trình duyệt mà không cần cài thêm ứng dụng.", "Quick sharing with unknown devices. Select files on PC and scan QR to download directly in browser without installing apps.")}</p>
                          {webshareStatus && (
                            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-3 rounded-lg flex items-start gap-2 max-w-sm">
                              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                              <p>{t("Đang chia sẻ file. Quét mã QR để tải về.", "Sharing files. Scan QR code to download.")}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button 
                          onClick={async () => {
                            import('@tauri-apps/plugin-dialog').then(async ({ open }) => {
                              const selected = await open({ multiple: true });
                              if (selected === null) return;
                              const files = Array.isArray(selected) ? selected : [selected];
                              
                              invoke("start_webshare", { files })
                                .then((port) => {
                                  setWebsharePort(port as number);
                                  setWebshareStatus(true);
                                })
                                .catch(err => alert("Lỗi WebShare: " + err));
                            });
                          }}
                          className="bg-tichphong-blue hover:bg-tichphong-blue-hover text-[#ffffff] px-5 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap shadow-lg shadow-tichphong-blue/20"
                        >
                          {t("Chọn file chia sẻ", "Select files to share")}
                        </button>
                        {webshareStatus && (
                          <button 
                            onClick={() => {
                              invoke("stop_webshare").then(() => setWebshareStatus(false));
                            }}
                            className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-5 py-2 rounded-lg font-medium transition-colors"
                          >
                            {t("Tắt chia sẻ", "Stop sharing")}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 bg-white/5 rounded-xl p-8 border border-white/5 flex flex-col items-center justify-center relative z-10 min-h-[250px]">
                      {webshareStatus ? (
                        <div className="flex flex-col items-center transition-all opacity-100 scale-100">
                          <div className="bg-white p-3 rounded-xl shadow-2xl">
                            <QRCode 
                              value={`http://${localIp}:${websharePort}`} 
                              size={160} 
                              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                            />
                          </div>
                          <p className="mt-4 font-medium text-white">
                            {t("Quét để tải file", "Scan to download")}
                          </p>
                          <code className="mt-2 text-sm text-gray-400">http://{localIp}:{websharePort}</code>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center opacity-50 grayscale transition-all">
                          <Wifi className="w-8 h-8 text-gray-600 mb-3" />
                          <p className="text-gray-500 text-sm">{t("Chưa có phiên chia sẻ nào đang hoạt động", "No active share sessions")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "settings" && (
              <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full gap-8 max-w-4xl mx-auto w-full">
                <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                    <Settings className="w-7 h-7 text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{t("Cài đặt Hệ thống", "System Settings")}</h1>
                    <p className="text-gray-400 text-sm">{t("Tùy chỉnh định danh, lưu trữ và cấu hình mạng của bạn", "Customize your identity, storage, and network configuration")}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Cấu hình định danh */}
                  <div className="glass-card rounded-2xl p-6 relative overflow-hidden group border border-white/5 hover:border-blue-500/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Smartphone className="w-24 h-24" />
                    </div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">{t("Định danh Thiết bị", "Device Identity")}</h2>
                    </div>
                    
                    <div className="space-y-5 relative z-10">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t("Tên hiển thị (Alias)", "Display Name (Alias)")}</label>
                        <input 
                          type="text" 
                          value={settings.alias}
                          onChange={async (e) => {
                            const newSettings = { ...settings, alias: e.target.value };
                            setSettings(newSettings);
                            await invoke("update_settings", { newSettings });
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all placeholder-gray-600"
                          placeholder={t("Nhập tên thiết bị...", "Enter device name...")}
                        />
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5"><Globe className="w-3 h-3" /> {t("Tên này sẽ hiển thị công khai trên mạng nội bộ.", "This name will be publicly visible on the local network.")}</p>
                      </div>

                      <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <p className="text-xs text-gray-400 mb-1">{t("Mã định danh bảo mật (Fingerprint)", "Security Fingerprint")}</p>
                        <p className="text-sm font-mono text-gray-300 break-all">{settings.fingerprint}</p>
                      </div>
                    </div>
                  </div>

                  {/* Lưu trữ */}
                  <div className="glass-card rounded-2xl p-6 relative overflow-hidden group border border-white/5 hover:border-purple-500/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <FolderOpen className="w-24 h-24" />
                    </div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">{t("Lưu trữ", "Storage")}</h2>
                    </div>
                    
                    <div className="space-y-5 relative z-10">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t("Thư mục nhận file", "Download Directory")}</label>
                        <div className="flex flex-col gap-3">
                          <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 flex items-center gap-3 overflow-hidden text-sm">
                            <FolderOpen className="w-4 h-4 shrink-0 text-purple-400" />
                            <span className="truncate">{settings.download_dir}</span>
                          </div>
                          <button onClick={handleSelectFolder} className="w-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-purple-500/50 transition-all px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2">
                            <FolderOpen className="w-4 h-4" /> {t("Thay đổi thư mục", "Change directory")}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">{t("Các file gửi đến sẽ được lưu tự động vào thư mục này.", "Incoming files will be automatically saved to this directory.")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Thông tin Mạng */}
                  <div className="glass-card rounded-2xl p-6 relative overflow-hidden group border border-white/5 hover:border-green-500/30 transition-colors lg:col-span-2">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Wifi className="w-24 h-24" />
                    </div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
                        <Globe className="w-5 h-5" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">{t("Thông tin Mạng & Giao thức", "Network & Protocol")}</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                      <div className="bg-gradient-to-br from-black/40 to-black/20 p-5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-gray-400">
                          <Link2 className="w-4 h-4" />
                          <p className="text-xs font-medium uppercase tracking-wider">{t("Giao thức cốt lõi", "Core Protocol")}</p>
                        </div>
                        <p className="font-semibold text-white text-lg">LocalSend v2</p>
                        <p className="text-xs text-gray-500 mt-1">{t("Yêu cầu cài đặt app LocalSend trên điện thoại", "Requires LocalSend app on mobile")}</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-black/40 to-black/20 p-5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-gray-400">
                          <Wifi className="w-4 h-4" />
                          <p className="text-xs font-medium uppercase tracking-wider">{t("Cổng nhận file", "Receive Port")}</p>
                        </div>
                        <p className="font-semibold text-white text-lg">53317 (TCP/UDP)</p>
                        <p className="text-xs text-green-400 mt-1 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> {t("Đang lắng nghe", "Listening")}</p>
                      </div>

                      <div className="bg-gradient-to-br from-black/40 to-black/20 p-5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-gray-400">
                          <Power className="w-4 h-4" />
                          <p className="text-xs font-medium uppercase tracking-wider">{t("Trạng thái Dịch vụ", "Service Status")}</p>
                        </div>
                        <p className="font-semibold text-white text-lg">{t("Hoạt động tốt", "Healthy")}</p>
                        <p className="text-xs text-green-400 mt-1 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Online</p>
                      </div>
                    </div>
                  </div>

                  {/* Giao diện (Theme) */}
                  <div className="glass-card rounded-2xl p-6 relative overflow-hidden group border border-white/5 hover:border-yellow-500/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Monitor className="w-24 h-24" />
                    </div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">{t("Giao diện (Theme)", "Theme")}</h2>
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setSettings({...settings, theme: 'dark'})}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${settings.theme !== 'light' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20 hover:bg-white/10'}`}>
                          <span className="text-xl">🌙</span>
                          <span className="font-medium text-sm">Dark Mode</span>
                        </button>
                        <button 
                          onClick={() => setSettings({...settings, theme: 'light'})}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${settings.theme === 'light' ? 'bg-blue-500/20 border-blue-500/50 text-blue-600' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:bg-white/10'}`}>
                          <span className="text-xl">☀️</span>
                          <span className="font-medium text-sm">Light Mode</span>
                        </button>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-sm font-medium mb-3">{t("Bộ sưu tập Nhạc Quán (Theme Packs)", "Nhac-Quan Theme Packs")}</p>
                        <div className="flex flex-wrap gap-3">
                          {[
                            { id: 'mystic', color: '#3D8F8F', name: 'Mystic (Mặc định)' },
                            { id: 'jade', color: '#047857', name: 'Jade Classic' },
                            { id: 'cinnabar', color: '#b91c1c', name: 'Deep Red' },
                            { id: 'purple', color: '#8b5cf6', name: 'Purple Dream' },
                            { id: 'tet', color: '#991b1b', name: 'Tet (Lễ hội)' },
                            { id: 'zen', color: '#525252', name: 'Zen (Thiền)' }
                          ].map(accent => (
                            <button
                              key={accent.id}
                              onClick={() => setSettings({...settings, accent: accent.id as any})}
                              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${settings.accent === accent.id ? 'border-white scale-110' : 'border-transparent'}`}
                              style={{ backgroundColor: accent.color }}
                              title={accent.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hệ thống & Ngôn ngữ */}
                  <div className="glass-card rounded-2xl p-6 relative overflow-hidden group border border-white/5 hover:border-orange-500/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Languages className="w-24 h-24" />
                    </div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                        <Languages className="w-5 h-5" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">{t("Ngôn ngữ (Language)", "Language")}</h2>
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setSettings({...settings, language: 'vi'})}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${settings.language === 'vi' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:bg-white/10'}`}
                        >
                          <span className="text-xl">🇻🇳</span>
                          <span className="font-medium text-sm">Tiếng Việt</span>
                        </button>
                        <button 
                          onClick={() => setSettings({...settings, language: 'en'})}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${settings.language === 'en' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:bg-white/10'}`}
                        >
                          <span className="text-xl">🇺🇸</span>
                          <span className="font-medium text-sm">English</span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-center">{t("Ngôn ngữ được áp dụng cho trang này.", "Language is applied to this page.")}</p>
                    </div>
                  </div>


                </div>
              </motion.div>
            )}

            {activeTab === "about" && (
              <motion.div key="about" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full gap-8 max-w-4xl mx-auto w-full">
                <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center border border-white/10">
                    <Info className="w-7 h-7 text-pink-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{t("Về TichPhong Share", "About TichPhong Share")}</h1>
                    <p className="text-gray-400 text-sm">{t("Dự án chia sẻ file mã nguồn mở cho hệ sinh thái TichPhong OS", "Open-source file sharing project for the TichPhong OS ecosystem")}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="glass-card rounded-2xl p-8 border border-white/5 transition-colors flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-tichphong-blue to-purple-500 rounded-3xl shadow-lg flex items-center justify-center mb-6 shadow-tichphong-blue/20">
                      <img src="/app-icon.png" alt="App Icon" className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">TichPhong Share</h2>
                    <p className="text-tichphong-blue font-medium mb-6">Version 1.0.0 (Standalone)</p>
                    <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-2xl mx-auto">
                      {t("Ứng dụng chia sẻ file siêu tốc, hỗ trợ đa nền tảng và tích hợp sâu với hệ sinh thái TichPhong OS. Chia sẻ qua LocalSend, Quick Share và WebDAV.", "High-speed file sharing app, cross-platform support and deeply integrated with TichPhong OS ecosystem. Share via LocalSend, Quick Share and WebDAV.")}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                      <button onClick={() => window.open('https://github.com/doccosau/TichPhong-Share', '_blank')} className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2.5 rounded-xl transition-colors font-medium text-sm text-gray-300 cursor-pointer">
                        GitHub
                      </button>
                      <button onClick={() => setShowGuide(true)} className="bg-tichphong-blue/10 text-tichphong-blue hover:bg-tichphong-blue/20 border border-tichphong-blue/20 px-6 py-2.5 rounded-xl transition-colors font-medium text-sm flex items-center justify-center gap-2 cursor-pointer">
                        <BookOpen className="w-4 h-4" /> User Guide
                      </button>
                      <button onClick={() => setShowDonate(true)} className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 px-6 py-2.5 rounded-xl transition-colors font-medium text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-500/10">
                        <Heart className="w-4 h-4" /> {t("Ủng hộ Dự án", "Donate")}
                      </button>
                      <button onClick={handleCheckUpdate} disabled={updateStatus === 'checking'} className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2.5 rounded-xl transition-colors font-medium text-sm text-gray-300 cursor-pointer flex items-center justify-center gap-2">
                        <RefreshCw className={`w-4 h-4 ${updateStatus === 'checking' ? 'animate-spin' : ''}`} /> 
                        {updateStatus === 'checking' ? t("Đang kiểm tra...", "Checking...") : t("Kiểm tra cập nhật", "Check for Updates")}
                      </button>
                    </div>
                    {updateStatus === 'latest' && <p className="mt-4 text-green-400 text-sm font-medium">{t("Bạn đang dùng phiên bản mới nhất!", "You are using the latest version!")}</p>}
                    {updateStatus === 'error' && <p className="mt-4 text-red-400 text-sm font-medium">{t("Lỗi khi kiểm tra cập nhật. Vui lòng thử lại sau.", "Error checking for updates. Please try again later.")}</p>}
                    {updateStatus === 'available' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-tichphong-blue/10 border border-tichphong-blue/30 rounded-xl p-5 w-full max-w-md flex flex-col items-center">
                        <p className="font-bold text-white mb-2">{t("Đã có phiên bản mới: ", "New version available: ")} v{latestVersion}</p>
                        <p className="text-xs text-gray-400 mb-4">{t("Truy cập GitHub để tải bản cài đặt tương thích với thiết bị của bạn.", "Go to GitHub to download the compatible installer for your device.")}</p>
                        <button onClick={() => window.open(releaseUrl, '_blank')} className="bg-tichphong-blue hover:bg-tichphong-blue-hover text-[#ffffff] px-6 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-tichphong-blue/20 w-full flex items-center justify-center gap-2 cursor-pointer">
                          <Download className="w-4 h-4" /> {t("Tải về ngay", "Download Now")}
                        </button>
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="glass-card rounded-2xl p-6 border border-white/5 text-center flex flex-col items-center">
                     <p className="text-sm text-gray-400 mb-2">{t("Ghi công (Credits)", "Credits")}</p>
                     <p className="text-xs text-gray-500 max-w-2xl mb-4">
                        Powered by Tauri v2 & React. Built by TichPhong OS Team.<br/>
                        Core protocols utilize LocalSend and Google Nearby Share standard. Icons by Lucide.
                     </p>
                     <div className="w-full max-w-3xl text-left bg-white/5 p-4 rounded-xl border border-white/10 max-h-48 overflow-y-auto text-xs text-gray-400 space-y-2">
                       <p className="font-bold text-gray-300 mb-2 text-sm">{t("Giấy phép & Tham khảo", "Licenses & Acknowledgements")}</p>
                       <p><strong>TichPhong Share</strong> is released under the MIT License.</p>
                       <p>This software utilizes the following open-source projects and protocols:</p>
                       <ul className="list-disc pl-4 space-y-1">
                          <li><strong>Tauri Framework</strong> (MIT / Apache-2.0)</li>
                          <li><strong>React</strong> (MIT License)</li>
                          <li><strong>LocalSend Protocol</strong> (MIT License) - Used for discovering and transferring files across local network devices.</li>
                          <li><strong>Nearby Share / Quick Share Protocol</strong> - Implemented based on open reverse-engineered standards (OpenDrop/Nearby) for compatibility with Android/Windows devices.</li>
                          <li><strong>Lucide Icons</strong> (ISC License)</li>
                          <li><strong>Tailwind CSS</strong> (MIT License)</li>
                          <li><strong>Framer Motion</strong> (MIT License)</li>
                       </ul>
                     </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transfer Status Modal Overlay */}
          <AnimatePresence>
            {transfer && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-tichphong-surface border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center"
                >
                  {transfer.status === 'waiting' && (
                    <div className="w-16 h-16 border-4 border-tichphong-blue border-t-transparent rounded-full animate-spin mb-4"></div>
                  )}
                  {transfer.status === 'sending' && (
                    <div className="w-full mb-4">
                      {transfer.progress !== undefined ? (
                        <>
                          <div className="flex justify-between text-xs text-gray-400 mb-2 font-medium">
                            <span>{formatSize(transfer.sent || 0)}</span>
                            <span className="text-tichphong-blue">{Math.round(transfer.progress)}%</span>
                            <span>{formatSize(transfer.total || 0)}</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden border border-white/10 relative">
                            <motion.div 
                              className="bg-gradient-to-r from-tichphong-blue to-cyan-400 h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${transfer.progress}%` }}
                              transition={{ ease: "linear", duration: 0.2 }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="w-16 h-16 mx-auto border-4 border-tichphong-blue border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>
                  )}
                  {transfer.status === 'success' && (
                    <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
                  )}
                  {transfer.status === 'error' && (
                    <XCircle className="w-16 h-16 text-red-500 mb-4" />
                  )}
                  
                  <h3 className="text-xl font-bold mb-2">
                    {transfer.status === 'waiting' && "Đang kết nối..."}
                    {transfer.status === 'sending' && "Đang gửi file..."}
                    {transfer.status === 'success' && "Thành công!"}
                    {transfer.status === 'error' && "Lỗi chuyển file"}
                  </h3>
                  
                  <p className="text-gray-400 text-sm mb-4">
                    {transfer.message}
                  </p>
                  
                  {(transfer.status === 'error' || transfer.status === 'success') && (
                    <button 
                      onClick={() => setTransfer(null)}
                      className="mt-4 w-full bg-white/10 hover:bg-white/20 transition-colors py-2 rounded-xl font-medium"
                    >
                      Đóng
                    </button>
                  )}
                  {transfer.status === 'sending' && (
                    <button 
                      onClick={handleCancelSend}
                      className="mt-4 w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors py-2 rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" /> Dừng gửi
                    </button>
                  )}
                  
                  {transfer.files && transfer.files.length > 0 && (
                    <div className="w-full mt-4 bg-white/5 rounded-xl p-3 border border-white/5 max-h-32 overflow-y-auto custom-scrollbar">
                      <p className="text-xs text-gray-500 font-medium mb-2 text-left uppercase">Danh sách File ({transfer.files.length}):</p>
                      <div className="flex flex-col gap-1">
                        {transfer.files.map((f, i) => (
                          <div key={i} className="text-sm truncate text-left flex items-center gap-2">
                             <FileIcon className="w-3 h-3 text-tichphong-blue shrink-0" />
                             {f.split(/(\\|\/)/g).pop()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* User Guide Modal */}
          <AnimatePresence>
            {showGuide && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 lg:p-12"
              >
                <motion.div 
                  initial={{ scale: 0.95, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 20 }}
                  className="glass-card border border-white/10 rounded-2xl w-full max-w-3xl max-h-full overflow-hidden shadow-2xl flex flex-col"
                >
                  <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 border border-pink-500/30">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[color:var(--color-white)]">{t("Sổ tay Hướng dẫn TichPhong Share", "TichPhong Share User Guide")}</h2>
                        <p className="text-sm text-[color:var(--color-gray-400)]">{t("Cách sử dụng mọi tính năng", "How to use all features")} (Version 1.0.0)</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setShowGuide(false)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 text-sm text-[color:var(--color-white)]">
                    <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                      <h3 className="text-blue-400 font-bold text-lg mb-2 flex items-center gap-2"><Send className="w-4 h-4" /> 1. {t("Gửi và Nhận File Nội Bộ", "Local File Sharing")} (LocalSend v2)</h3>
                      <p className="mb-2">{t("TichPhong Share tương thích 100% với hệ sinh thái ", "TichPhong Share is 100% compatible with the ")}<strong>LocalSend</strong>{t(" ecosystem. Để gửi nhận mượt mà nhất:", ". For the best experience:")}</p>
                      <ul className="list-disc pl-5 space-y-1 text-[color:var(--color-gray-400)]">
                        <li>{t("Cài đặt ứng dụng ", "Install the ")}<strong>LocalSend</strong>{t(" trên điện thoại (Có sẵn trên App Store / Google Play).", " app on your mobile device (Available on App Store / Google Play).")}</li>
                        <li>{t("Đảm bảo điện thoại và PC TichPhong dùng chung mạng WiFi.", "Ensure your mobile device and TichPhong PC are on the same WiFi network.")}</li>
                        <li>{t("Trên điện thoại, PC sẽ hiển thị với tên (Alias) được đặt trong Cài đặt.", "On your phone, the PC will appear with the Alias configured in Settings.")}</li>
                      </ul>
                    </div>

                    <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                      <h3 className="text-purple-400 font-bold text-lg mb-2 flex items-center gap-2"><HardDrive className="w-4 h-4" /> 2. {t("Biến PC thành Ổ Đĩa", "Turn PC into Network Drive")} (WebDAV)</h3>
                      <p className="mb-2">{t("Tính năng này cho phép bạn \"mở\" thư mục TichPhong Share trên PC thành một ổ đĩa mạng, để điện thoại truy cập tự do như ổ cứng ngoài.", "This feature allows you to mount the TichPhong Share folder as a network drive, letting your phone access it freely like an external hard drive.")}</p>
                      <ul className="list-disc pl-5 space-y-1 text-[color:var(--color-gray-400)]">
                        <li>{t("Bật máy chủ WebDAV trong tab ", "Start the WebDAV server in the ")}<strong>{t("Cổng chia sẻ thiết bị", "Device Portal")}</strong>{t(" tab.", "")}</li>
                        <li>{t("Trên Android: Mở Solid Explorer / CX File Explorer, thêm Network Drive loại WebDAV và nhập URL trên màn hình.", "On Android: Open Solid Explorer / CX File Explorer, add a WebDAV Network Drive and enter the displayed URL.")}</li>
                        <li>{t("Trên iOS: Mở app Tệp (Files) > Dấu 3 chấm > Kết nối máy chủ > Nhập URL WebDAV.", "On iOS: Open Files app > 3 Dots > Connect to Server > Enter the WebDAV URL.")}</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                      <h3 className="text-green-400 font-bold text-lg mb-2 flex items-center gap-2"><QrCode className="w-4 h-4" /> 3. WebShare ({t("Chia sẻ qua QR Code", "Share via QR Code")})</h3>
                      <p className="mb-2">{t("Nếu không muốn cài thêm app, WebShare là giải pháp tối ưu.", "If you don't want to install additional apps, WebShare is the ultimate solution.")}</p>
                      <ul className="list-disc pl-5 space-y-1 text-[color:var(--color-gray-400)]">
                        <li>{t("Bấm \"Chọn file chia sẻ\" trong WebShare để chọn các file bạn muốn gửi.", "Click \"Select files to share\" in WebShare to choose the files you want to send.")}</li>
                        <li>{t("PC sẽ tạo một mã QR đặc biệt.", "The PC will generate a special QR code.")}</li>
                        <li>{t("Người nhận dùng Camera điện thoại quét mã QR. Safari hoặc Google Chrome sẽ mở ra trang tải file trực tiếp siêu tốc!", "The recipient scans the QR code with their mobile camera. Safari or Chrome will open a direct download page!")}</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                      <h3 className="text-orange-400 font-bold text-lg mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> {t("Thông tin Giấy phép", "License Information")}</h3>
                      <p className="text-gray-400">
                        {t("TichPhong Share được phát triển độc quyền cho Hệ điều hành TichPhong OS.", "TichPhong Share is exclusively developed for TichPhong OS.")}<br/>
                        {t("Sử dụng mã nguồn mở LocalSend/rqs (MIT License) để đảm bảo tính minh bạch và bảo mật mã hóa đầu cuối.", "Uses open-source LocalSend/rqs (MIT License) to ensure transparency and end-to-end encryption security.")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-4 border-t border-white/10 bg-white/5 text-center">
                    <button type="button" onClick={() => setShowGuide(false)} className="bg-tichphong-blue hover:bg-tichphong-blue-hover text-[#ffffff] px-8 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-tichphong-blue/20 cursor-pointer">
                      {t("Đã hiểu", "Understood")}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Donate Modal */}
          <AnimatePresence>
            {showDonate && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
              >
                <motion.div 
                  initial={{ scale: 0.95, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 20 }}
                  className="glass-card border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col relative"
                >
                  <button type="button" onClick={() => setShowDonate(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-colors cursor-pointer z-10">
                    <X className="w-4 h-4" />
                  </button>
                  
                  <div className="bg-gradient-to-br from-rose-500/20 to-pink-500/5 p-8 flex flex-col items-center justify-center text-center border-b border-white/5">
                      <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/20">
                        <Heart className="w-8 h-8" fill="currentColor" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{t("Ủng hộ Dự án", "Support the Project")}</h3>
                      <p className="text-sm text-gray-400">
                         {t("Cảm ơn bạn đã đồng hành. Sự ủng hộ của bạn là động lực lớn nhất của chúng tôi!", "Thank you for your support. Your support means the world to us!")}
                      </p>
                  </div>
                  
                  <div className="p-6 bg-white/5 flex flex-col items-center">
                      <div className="bg-white rounded-2xl p-4 mb-5 shadow-xl transition-transform hover:scale-105">
                        <img src="https://api.vietqr.io/image/970423-93150637084-0dUeQ0W.jpg?accountName=DO%20CHI%20DANH&amount=0" alt="VietQR" className="w-48 h-48 object-cover rounded-xl" />
                      </div>
                      
                      <div className="bg-black/20 rounded-xl p-4 border border-white/10 w-full text-center">
                        <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-medium">Ngân hàng TPBank</p>
                        <p className="text-sm text-white font-bold mb-2">DO CHI DANH</p>
                        <div className="flex items-center justify-center gap-2">
                          <p className="font-mono text-xl text-rose-400 font-bold tracking-wider">93150637084</p>
                          <button onClick={() => navigator.clipboard.writeText('93150637084')} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-gray-300 cursor-pointer" title="Sao chép STK">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {qsTransfer && qsTransfer.state && [
              "ReceivedConnectionRequest", "SentConnectionResponse", "WaitingForUserConsent", "ReceivingFiles", "SendingFiles",
              "Initial", "SentUkeyClientInit", "SentUkeyClientFinish", "SentPairedKeyEncryption", "SentPairedKeyResult", "SentIntroduction"
            ].includes(qsTransfer.state) && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="absolute bottom-4 left-4 right-4 bg-tichphong-surface border border-tichphong-border p-4 rounded-xl shadow-2xl z-50 flex flex-col gap-3 backdrop-blur-xl"
              >
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    qsTransfer.rtype === "Outbound" 
                      ? "bg-tichphong-blue/20 text-tichphong-blue" 
                      : "bg-blue-500/20 text-blue-400"
                  }`}>
                    {qsTransfer.rtype === "Outbound" ? <Send size={20} /> : <Smartphone size={20} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[color:var(--color-white)]">
                      {qsTransfer.rtype === "Outbound" 
                        ? `${t("Gửi Quick Share đến", "Sending via Quick Share to")} ${qsTransfer.meta?.source?.name || t("thiết bị", "device")}`
                        : `Quick Share ${t("từ", "from")} ${qsTransfer.meta?.source?.name || t("Thiết bị Android", "Android Device")}`
                      }
                    </h3>
                    <p className="text-sm text-[color:var(--color-gray-400)]">
                      {getQSStateText(qsTransfer.state, qsTransfer.rtype === "Outbound")}
                    </p>
                  </div>
                  {/* Dismiss for non-actionable states */}
                  {(qsTransfer.rtype === "Outbound" && ["SendingFiles", "SentIntroduction"].includes(qsTransfer.state || "")) && (
                    <div className="w-6 h-6 border-2 border-tichphong-blue border-t-transparent rounded-full animate-spin shrink-0"></div>
                  )}
                </div>
                
                {/* PIN Code - Only for inbound consent */}
                {qsTransfer.rtype !== "Outbound" && qsTransfer.meta?.pin_code && (
                  <div className="bg-tichphong-blue/10 border border-tichphong-blue/20 p-3 rounded-lg text-center">
                    <span className="text-[color:var(--color-gray-400)] text-xs uppercase tracking-widest block mb-1">{t("Mã PIN", "PIN Code")}</span>
                    <span className="text-2xl font-mono text-tichphong-blue tracking-widest font-bold">{qsTransfer.meta.pin_code}</span>
                  </div>
                )}
                
                {/* Progress bar - for both sending and receiving */}
                {(qsTransfer.state === "ReceivingFiles" || qsTransfer.state === "SendingFiles") && qsTransfer.meta && qsTransfer.meta.total_bytes > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-[color:var(--color-gray-400)] mb-1">
                      <span>{formatSize(qsTransfer.meta.ack_bytes || 0)}</span>
                      <span className="text-tichphong-blue font-semibold">{Math.round(Math.min(100, (qsTransfer.meta.ack_bytes / qsTransfer.meta.total_bytes) * 100))}%</span>
                      <span>{formatSize(qsTransfer.meta.total_bytes)}</span>
                    </div>
                    <div className="w-full bg-tichphong-blue/10 rounded-full h-2.5 overflow-hidden border border-tichphong-border">
                      <motion.div 
                        className={`h-full rounded-full ${qsTransfer.rtype === "Outbound" ? "bg-gradient-to-r from-tichphong-blue to-cyan-400" : "bg-gradient-to-r from-blue-500 to-blue-400"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.max(0, (qsTransfer.meta.ack_bytes / qsTransfer.meta.total_bytes) * 100))}%` }}
                        transition={{ ease: "linear", duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                {/* File list for outbound */}
                {qsTransfer.rtype === "Outbound" && qsTransfer.meta?.files && qsTransfer.meta.files.length > 0 && !(["SendingFiles", "ReceivingFiles"].includes(qsTransfer.state || "")) && (
                  <div className="bg-tichphong-blue/5 border border-tichphong-border rounded-lg p-2 max-h-20 overflow-y-auto custom-scrollbar">
                    {qsTransfer.meta.files.map((f, i) => (
                      <div key={i} className="text-xs text-[color:var(--color-gray-400)] truncate flex items-center gap-1.5 py-0.5">
                        <FileIcon className="w-3 h-3 text-tichphong-blue shrink-0" />
                        {f.split(/(\\|\/)/g).pop()}
                      </div>
                    ))}
                  </div>
                )}
  
                {/* Accept/Reject for INBOUND only */}
                {qsTransfer.rtype !== "Outbound" && (!qsTransfer.state || qsTransfer.state === "Initial" || qsTransfer.state === "WaitingForUserConsent" || qsTransfer.state === "ReceivedConnectionRequest") && (
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => invoke("reject_quickshare", { id: qsTransfer.id })}
                      className="flex-1 py-2 rounded-lg border border-tichphong-border text-[color:var(--color-gray-400)] hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition font-medium cursor-pointer"
                    >
                      {t("Từ chối", "Decline")}
                    </button>
                    <button 
                      onClick={() => invoke("accept_quickshare", { id: qsTransfer.id })}
                      className="flex-1 py-2 rounded-lg bg-blue-600 text-[#ffffff] hover:bg-blue-500 transition shadow-lg shadow-blue-500/20 font-medium cursor-pointer"
                    >
                      {t("Chấp nhận", "Accept")}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default App;

