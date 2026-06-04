import { motion, type Variants } from 'framer-motion';
import { Share2, Zap, Shield, ArrowRight, Download, MonitorSmartphone, WifiOff, Rocket, CheckCircle2, Monitor, Terminal, QrCode } from 'lucide-react';
import './index.css';

export default function App() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 30, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 80, damping: 20 }
    }
  };

  return (
    <div className="min-h-screen bg-tp-base text-tp-text selection:bg-tp-primary/30 relative overflow-hidden font-sans">
      {/* Aurora Background */}
      <div className="aurora-bg"></div>
      
      {/* Subtle Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMTYsIDE4NSwgMTI5LCAwLjA1KSIvPjwvc3ZnPg==')] opacity-40 z-0 pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-tp-primary via-tp-secondary to-tp-accent flex items-center justify-center shadow-lg shadow-tp-primary/20 p-0.5">
              <div className="w-full h-full bg-tp-surface rounded-[14px] flex items-center justify-center">
                <Share2 size={24} className="text-tp-primary" />
              </div>
            </div>
            <span className="text-2xl font-black tracking-tight text-white">TichPhong Share <span className="text-tp-primary">Pro</span></span>
          </div>
          <a href="https://github.com/doccosau/TichPhong-Share/releases/latest" target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 rounded-full bg-gradient-to-r from-tp-primary to-tp-secondary text-white hover:shadow-xl hover:shadow-tp-primary/30 transition-all font-bold text-sm flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
            <Download size={18} className="relative z-10" />
            <span className="relative z-10">Tải Bản v2.0.0</span>
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-40 pb-24 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-center max-w-5xl mx-auto flex flex-col items-center"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card text-tp-primary font-bold text-sm mb-10 border-tp-primary/20 hover:border-tp-primary/40 transition-colors">
              <Zap size={18} className="animate-pulse" />
              <span className="uppercase tracking-wider text-xs">Phiên bản 2.0.0 hoàn toàn mới</span>
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-8 leading-[1.05]">
              Vượt qua mọi <br className="hidden md:block"/>
              <span className="text-gradient drop-shadow-lg shadow-tp-primary">
                giới hạn truyền tải
              </span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-xl md:text-2xl text-tp-subtext mb-12 max-w-3xl mx-auto leading-relaxed font-medium opacity-90">
              Chia sẻ tệp tin siêu tốc giữa mọi thiết bị. Tích hợp <span className="text-white">QR Connect</span> và <span className="text-white">Quick Share</span>. <br className="hidden md:block"/> 
              <span className="text-tp-primary font-semibold">Bảo mật tuyệt đối. Không cần internet.</span>
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <a href="https://github.com/doccosau/TichPhong-Share/releases/latest" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-tp-overlay border border-white/10 text-white font-bold text-lg hover:bg-tp-overlay/80 transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-3">
                <Monitor size={22} className="text-blue-400" />
                Tải cho Windows
              </a>
              <a href="https://github.com/doccosau/TichPhong-Share/releases/latest" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-tp-primary to-tp-secondary text-white font-bold text-lg hover:shadow-xl hover:shadow-tp-primary/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group glow-button">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                <Terminal size={22} className="relative z-10" />
                <span className="relative z-10">Tải cho Linux / TichPhong OS</span>
              </a>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-8 flex justify-center">
              <a href="https://github.com/doccosau/TichPhong-Share" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-tp-subtext hover:text-white transition-colors font-semibold group">
                Xem mã nguồn trên GitHub
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-12 flex flex-wrap justify-center items-center gap-6 text-sm font-semibold text-tp-subtext/80">
               <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10"><CheckCircle2 size={16} className="text-tp-primary"/> Giao thức TichPhong Direct</div>
               <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10"><CheckCircle2 size={16} className="text-blue-400"/> Tương thích Google Quick Share</div>
               <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10"><CheckCircle2 size={16} className="text-green-400"/> LocalSend v2</div>
            </motion.div>
          </motion.div>

          {/* App Preview Mockup */}
          <motion.div 
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 50, damping: 20 }}
            className="mt-28 relative max-w-6xl mx-auto animate-float z-20"
          >
            {/* Glowing backdrop for the mockup */}
            <div className="absolute inset-0 bg-gradient-to-r from-tp-primary to-tp-accent opacity-20 blur-[120px] rounded-[3rem] -z-10" />
            
            <div className="glass-card rounded-[2.5rem] p-4 md:p-6 border border-white/10 shadow-[0_30px_80px_-15px_rgba(5,150,105,0.4)] relative overflow-hidden group">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-2 bg-white/20 rounded-b-xl blur-[1px]"></div>
              
              <div className="bg-tp-surface rounded-[2rem] overflow-hidden aspect-[16/10] relative flex items-center justify-center shadow-inner">
                <img 
                  src="/screenshots/qrc_active.png" 
                  alt="QR Connect Interface" 
                  className="w-full h-full object-cover transform group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                />
                
                {/* Decorative UI elements overlay */}
                <div className="absolute bottom-6 right-6 glass-card px-5 py-3 rounded-2xl flex items-center gap-4 animate-float-delayed backdrop-blur-3xl border-white/10 bg-tp-surface/80 shadow-2xl">
                   <div className="w-10 h-10 rounded-xl bg-tp-primary/20 flex items-center justify-center text-tp-primary"><QrCode size={24}/></div>
                   <div>
                     <div className="text-sm font-bold text-white">Quét mã QR</div>
                     <div className="text-xs text-tp-subtext">Kết nối ngay không cần app</div>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="py-32 relative z-10 bg-gradient-to-b from-transparent to-tp-overlay/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 relative z-10">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">Công nghệ <span className="text-gradient">đột phá</span></h2>
            <p className="text-xl text-tp-subtext max-w-2xl mx-auto font-medium">Bản cập nhật v2.0.0 mang đến khả năng kết nối chưa từng có trên bất kỳ phần mềm chia sẻ file nào.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: QrCode, title: 'QR Connect', desc: 'Sử dụng giao thức TichPhong Direct độc quyền. Dùng camera điện thoại quét mã QR trên PC và gửi/nhận file trực tiếp qua WebApp di động.' },
              { icon: Zap, title: 'Tốc Độ Ánh Sáng', desc: 'Khai thác tối đa băng thông router mạng LAN của bạn. Chuyển tệp tin hàng Gigabyte chỉ trong vài giây.' },
              { icon: MonitorSmartphone, title: 'Tương Thích Cao', desc: 'Hỗ trợ Android, Windows qua chuẩn Quick Share (Nearby Connections) và chuẩn LocalSend.' },
              { icon: WifiOff, title: 'Hoạt Động Offline', desc: 'Không cần kết nối Internet. Chỉ cần các thiết bị ở chung một mạng Wi-Fi hoặc mạng LAN, hay thậm chí phát Hotspot.' },
              { icon: Shield, title: 'Bảo Mật Cục Bộ', desc: 'Dữ liệu truyền trực tiếp giữa 2 thiết bị thông qua HTTPS và WebSockets, không lưu trữ trên đám mây.' },
              { icon: Rocket, title: 'Tối Ưu & Siêu Nhẹ', desc: 'Xây dựng trên nền tảng Rust và Tauri v2, ngốn cực ít RAM và chạy mượt mà ngay cả trên phần cứng cũ.' }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 50 }}
                className="glass-card p-10 rounded-[2rem] group hover:bg-white/[0.02]"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-tp-primary/20 to-tp-accent/20 border border-white/10 shadow-inner rounded-2xl flex items-center justify-center mb-8 text-tp-primary group-hover:scale-110 transition-transform duration-300 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <feature.icon size={32} />
                </div>
                <h3 className="text-2xl font-black text-white mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-tp-subtext leading-relaxed font-medium">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 pt-20 pb-12 bg-tp-surface relative z-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
             <div className="w-10 h-10 rounded-xl bg-tp-primary flex items-center justify-center shadow-lg shadow-tp-primary/20">
                <Share2 size={20} className="text-white" />
             </div>
             <span className="text-2xl font-black text-white tracking-tight">TichPhong Share <span className="text-tp-primary">Pro</span></span>
          </div>
          <p className="text-tp-subtext font-medium text-lg mb-8 max-w-md mx-auto">Phần mềm mã nguồn mở miễn phí, thiết kế bởi cộng đồng TichPhong OS.</p>
          <div className="text-sm font-semibold text-tp-subtext/60">
            © {new Date().getFullYear()} TichPhong OS Team.
          </div>
        </div>
      </footer>
    </div>
  );
}
