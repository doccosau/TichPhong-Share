import { motion, type Variants } from 'framer-motion';
import { Share2, Zap, Shield, ArrowRight, Download, MonitorSmartphone, WifiOff, Rocket, CheckCircle2, Monitor, Terminal } from 'lucide-react';
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
    <div className="min-h-screen bg-tp-base text-tp-text selection:bg-tp-primary/30 relative overflow-hidden">
      {/* Aurora Background */}
      <div className="aurora-bg"></div>
      
      {/* Subtle Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoNSwgMTUwLCAxMDUsIDAu০৮KSIvPjwvc3ZnPg==')] opacity-40 z-0 pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-tp-primary/10 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-tp-primary via-tp-secondary to-tp-accent flex items-center justify-center shadow-lg shadow-tp-primary/30 p-0.5">
              <div className="w-full h-full bg-tp-surface rounded-[14px] flex items-center justify-center">
                <Share2 size={24} className="text-tp-primary" />
              </div>
            </div>
            <span className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-tp-primary to-tp-accent">TichPhong Share</span>
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
            
            <motion.h1 variants={itemVariants} className="text-6xl md:text-8xl font-black tracking-tighter text-tp-text mb-8 leading-[1.05] font-serif">
              Vượt qua mọi <br className="hidden md:block"/>
              <span className="text-gradient drop-shadow-sm">
                giới hạn truyền tải
              </span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-xl md:text-2xl text-tp-subtext mb-12 max-w-3xl mx-auto leading-relaxed font-medium opacity-90">
              Chia sẻ tệp tin siêu tốc giữa mọi thiết bị. Đã tích hợp tính năng QR Connect và công nghệ Quick Share tiên tiến. <br className="hidden md:block"/> 
              <span className="text-tp-primary font-semibold">Bảo mật tuyệt đối. Không cần internet.</span>
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <a href="https://github.com/doccosau/TichPhong-Share/releases/latest" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-tp-text text-white font-bold text-lg hover:bg-tp-text/90 transition-all shadow-xl shadow-tp-text/20 hover:scale-105 active:scale-95 flex items-center justify-center gap-3 glow-button">
                <Monitor size={22} />
                Tải cho Windows
              </a>
              <a href="https://github.com/doccosau/TichPhong-Share/releases/latest" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-tp-primary to-tp-secondary text-white font-bold text-lg hover:shadow-xl hover:shadow-tp-primary/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                <Terminal size={22} className="relative z-10" />
                <span className="relative z-10">Tải cho Linux</span>
              </a>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-8 flex justify-center">
              <a href="https://github.com/doccosau/TichPhong-Share" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-tp-subtext hover:text-tp-primary transition-colors font-semibold group">
                Xem mã nguồn trên GitHub
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-12 flex flex-wrap justify-center items-center gap-6 text-sm font-semibold text-tp-subtext/80">
               <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-tp-primary"/> Giao thức TichPhong Direct</div>
               <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-tp-primary"/> Mã nguồn mở</div>
               <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-tp-primary"/> Hoàn toàn miễn phí</div>
            </motion.div>
          </motion.div>

          {/* App Preview Mockup */}
          <motion.div 
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 50, damping: 20 }}
            className="mt-28 relative max-w-5xl mx-auto animate-float z-20"
          >
            {/* Glowing backdrop for the mockup */}
            <div className="absolute inset-0 bg-gradient-to-r from-tp-primary to-tp-accent opacity-20 blur-[100px] rounded-[3rem] -z-10" />
            
            <div className="glass-card rounded-[2.5rem] p-4 md:p-6 border border-white/60 shadow-[0_30px_60px_-15px_rgba(5,150,105,0.3)] relative overflow-hidden group">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-2 bg-white/40 rounded-b-xl blur-[1px]"></div>
              
              <div className="bg-tp-surface rounded-[2rem] overflow-hidden aspect-[16/10] relative flex items-center justify-center shadow-inner">
                <img 
                  src="/screenshots/qrc_active.png" 
                  alt="TichPhong Share Interface" 
                  className="w-full h-full object-cover transform group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                />
                
                {/* Decorative UI elements overlay */}
                <div className="absolute top-6 left-6 glass-card px-4 py-2 rounded-xl flex items-center gap-3 animate-float-delayed">
                   <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-600"><CheckCircle2 size={20}/></div>
                   <div>
                     <div className="text-xs font-bold text-tp-text">Thiết bị đã kết nối</div>
                     <div className="text-[10px] text-tp-subtext">iPhone 15 Pro Max</div>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="py-32 relative z-10 bg-gradient-to-b from-transparent to-white/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 relative z-10">
            <h2 className="text-4xl md:text-6xl font-black text-tp-text mb-6 tracking-tight">Tối ưu cho <span className="text-gradient">trải nghiệm</span></h2>
            <p className="text-xl text-tp-subtext max-w-2xl mx-auto font-medium">Được thiết kế tỉ mỉ để việc chia sẻ dữ liệu trở nên tự nhiên và dễ dàng nhất có thể.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'Tốc Độ Ánh Sáng', desc: 'Khai thác tối đa băng thông mạng LAN của bạn. Chuyển tệp tin hàng Gigabyte chỉ trong vài giây.' },
              { icon: MonitorSmartphone, title: 'QR Connect', desc: 'Quét mã QR trên PC bằng điện thoại để kết nối và truyền file 2 chiều thông qua WebApp vô cùng tiện lợi.' },
              { icon: WifiOff, title: 'Hoạt Động Offline', desc: 'Không cần kết nối Internet. Chỉ cần các thiết bị ở chung một mạng Wi-Fi hoặc dùng Hotspot.' },
              { icon: Shield, title: 'Bảo Mật Cục Bộ', desc: 'Mã hóa đầu cuối vững chắc. Dữ liệu truyền trực tiếp giữa các thiết bị, không lưu trữ trên máy chủ đám mây.' },
              { icon: Share2, title: 'Đa Giao Thức', desc: 'Hoàn toàn tương thích với giao thức LocalSend, Google Quick Share và TichPhong Direct.' },
              { icon: Rocket, title: 'Giao Diện Hiện Đại', desc: 'Thiết kế trực quan, mượt mà được tối ưu cho TichPhong OS. Tối giản nhưng vô cùng mạnh mẽ.' }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 50 }}
                className="glass-card p-10 rounded-[2rem] group"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-tp-primary/10 to-tp-accent/10 border border-white/50 shadow-inner rounded-2xl flex items-center justify-center mb-8 text-tp-primary group-hover:scale-110 transition-transform duration-300 group-hover:shadow-[0_0_20px_rgba(5,150,105,0.3)]">
                  <feature.icon size={32} />
                </div>
                <h3 className="text-2xl font-black text-tp-text mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-tp-subtext leading-relaxed font-medium">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-tp-primary/10 pt-20 pb-12 glass relative z-10 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
             <div className="w-10 h-10 rounded-xl bg-tp-primary flex items-center justify-center shadow-lg shadow-tp-primary/20">
                <Share2 size={20} className="text-white" />
             </div>
             <span className="text-2xl font-black text-tp-text tracking-tight">TichPhong Share</span>
          </div>
          <p className="text-tp-subtext font-medium text-lg mb-8 max-w-md mx-auto">Phần mềm mã nguồn mở miễn phí, phát triển bởi cộng đồng TichPhong OS.</p>
          <div className="text-sm font-semibold text-tp-subtext/60">
            © {new Date().getFullYear()} TichPhong OS.
          </div>
        </div>
      </footer>
    </div>
  );
}
