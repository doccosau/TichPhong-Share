import { motion, type Variants } from 'framer-motion';
import { Share2, Zap, Shield, ArrowRight, Download, MonitorSmartphone, WifiOff, Rocket, CheckCircle2, Monitor, Terminal, QrCode, Heart, Code, Check, Globe, Package, Wifi } from 'lucide-react';
import { useState } from 'react';
import './index.css';

export default function App() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

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

  const faqs = [
    { q: "TichPhong Share có miễn phí không?", a: "Hoàn toàn miễn phí. Phần mềm được phát triển dưới dạng mã nguồn mở và sẽ luôn miễn phí, không có quảng cáo." },
    { q: "Tôi có cần kết nối Internet để gửi file?", a: "Không cần. TichPhong Share truyền dữ liệu qua mạng cục bộ (LAN hoặc Wi-Fi). Thậm chí bạn có thể phát Wi-Fi Hotspot từ điện thoại để kết nối trực tiếp với máy tính ở nơi không có mạng." },
    { q: "Tốc độ truyền tải tối đa là bao nhiêu?", a: "Tốc độ phụ thuộc vào router Wi-Fi hoặc cáp mạng LAN của bạn. Với Wi-Fi 5/6, tốc độ có thể đạt từ 30MB/s đến hơn 100MB/s, nhanh hơn rất nhiều so với Bluetooth." },
    { q: "TichPhong Share sử dụng công nghệ gì?", a: "Chúng tôi phát triển giao thức TichPhong Direct (được bảo vệ bởi GPLv3) tối ưu cho TichPhong OS. Đồng thời, ứng dụng kế thừa và tương thích ngược với mạng lưới của Quick Share (rqs - GPLv3) và LocalSend (Apache 2.0) giúp kết nối chéo với mọi thiết bị Android/iOS dễ dàng." },
    { q: "Phiên bản 2.0 khi nào ra mắt?", a: "Phiên bản 2.0 (với tính năng QR Connect và TichPhong Direct) đang trong giai đoạn hoàn thiện cuối cùng và sẽ sớm được phát hành trên GitHub (Coming Soon)." }
  ];

  return (
    <div className="min-h-screen bg-tp-base text-tp-text selection:bg-tp-primary/30 relative overflow-hidden font-sans">
      {/* Aurora Background */}
      <div className="aurora-bg"></div>
      
      {/* Subtle Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoNSwgMTUwLCAxMDUsIDAu০৮KSIvPjwvc3ZnPg==')] opacity-40 z-0 pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-tp-primary/10 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="TichPhong Share Logo" className="w-12 h-12 drop-shadow-md rounded-2xl" />
            <span className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-tp-primary to-tp-accent">TichPhong Share</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-tp-subtext hover:text-tp-primary font-medium transition-colors">Tính năng</a>
            <a href="#how-it-works" className="text-tp-subtext hover:text-tp-primary font-medium transition-colors">Hướng dẫn</a>
            <a href="#faq" className="text-tp-subtext hover:text-tp-primary font-medium transition-colors">Hỏi đáp</a>
          </div>
          <a href="#download" className="px-6 py-2.5 rounded-full bg-gradient-to-r from-tp-primary to-tp-secondary text-white hover:shadow-xl hover:shadow-tp-primary/30 transition-all font-bold text-sm flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
            <Download size={18} className="relative z-10" />
            <span className="relative z-10">Tải Bản Stable</span>
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-40 pb-16 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-center max-w-5xl mx-auto flex flex-col items-center"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card text-tp-primary font-bold text-sm mb-10 border-tp-primary/20 hover:border-tp-primary/40 transition-colors shadow-sm">
              <Rocket size={16} />
              <span className="uppercase tracking-wider text-xs">V2.0.0 Coming Soon - <span className="font-charm text-base lowercase tracking-normal">Đột phá mới</span></span>
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-6xl md:text-8xl font-black tracking-tighter text-tp-text mb-8 leading-[1.05] ">
              Vượt qua mọi <br className="hidden md:block"/>
              <span className="text-gradient drop-shadow-sm">
                giới hạn truyền tải
              </span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-xl md:text-2xl text-tp-subtext mb-12 max-w-3xl mx-auto leading-relaxed font-medium opacity-90">
              Chia sẻ tệp tin siêu tốc giữa mọi thiết bị qua <span className="text-tp-primary font-bold">QR Connect</span>, <span className="text-tp-primary font-bold">Quick Share</span> & <span className="text-tp-primary font-bold">LocalSend</span>. <br className="hidden md:block"/> 
              <span className="text-tp-text font-semibold">Bảo mật tuyệt đối. Không giới hạn dung lượng.</span>
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <a href="#download" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-tp-text text-white font-bold text-lg hover:bg-tp-text/90 transition-all shadow-xl shadow-tp-text/20 hover:scale-105 active:scale-95 flex items-center justify-center gap-3 glow-button">
                <Download size={22} />
                Tải bản Ổn định
              </a>
              <a href="https://github.com/doccosau/TichPhong-Share" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-tp-surface border border-tp-primary/20 text-tp-text font-bold text-lg hover:shadow-xl hover:shadow-tp-primary/10 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group">
                 <div className="absolute inset-0 bg-tp-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                <Code size={22} className="relative z-10" />
                <span className="relative z-10">Mã nguồn GitHub</span>
              </a>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-12 flex flex-wrap justify-center items-center gap-6 text-sm font-bold text-tp-subtext/80">
               <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-tp-primary"/> Giao thức TichPhong Direct</div>
               <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-tp-primary"/> Mã nguồn mở 100%</div>
               <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-tp-primary"/> Không chèn quảng cáo</div>
            </motion.div>
          </motion.div>

          {/* Social Proof / Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-16 pt-8 border-t border-tp-primary/10 flex flex-wrap justify-center gap-12 text-center"
          >
             <div>
                <div className="text-3xl font-black text-tp-text mb-1 ">50+</div>
                <div className="text-sm font-medium text-tp-subtext uppercase tracking-wider">Lượt Tải</div>
             </div>
             <div>
                <div className="text-3xl font-black text-tp-text mb-1 ">100%</div>
                <div className="text-sm font-medium text-tp-subtext uppercase tracking-wider">Miễn phí</div>
             </div>
             <div>
                <div className="text-3xl font-black text-tp-text mb-1 ">P2P</div>
                <div className="text-sm font-medium text-tp-subtext uppercase tracking-wider">Kết nối trực tiếp</div>
             </div>
          </motion.div>

          {/* App Preview Mockup */}
          <motion.div 
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 50, damping: 20 }}
            className="mt-24 relative max-w-6xl mx-auto z-20"
          >
            {/* Glowing backdrop for the mockup */}
            <div className="absolute inset-0 bg-gradient-to-r from-tp-primary to-tp-accent opacity-15 blur-[120px] rounded-[3rem] -z-10" />
            
            <div className="glass-card rounded-[2.5rem] p-4 md:p-6 border border-white/60 shadow-[0_30px_60px_-15px_rgba(5,150,105,0.2)] relative overflow-hidden group flex flex-col md:flex-row gap-6 items-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-2 bg-white/40 rounded-b-xl blur-[1px] z-10"></div>
              
              <div className="flex-1 w-full bg-tp-surface rounded-[2rem] overflow-hidden relative shadow-inner">
                <img 
                  src="/screenshots/qrc_active.png" 
                  alt="TichPhong Share PC Interface" 
                  className="w-full h-full object-cover transform group-hover:scale-[1.01] transition-transform duration-700 ease-out"
                />
                
                {/* Decorative UI elements overlay */}
                <div className="absolute top-6 left-6 glass-card px-4 py-2 rounded-xl flex items-center gap-3 animate-float-delayed backdrop-blur-3xl shadow-xl border-white/50 bg-white/90">
                   <div className="w-8 h-8 rounded-full bg-tp-primary/20 flex items-center justify-center text-tp-primary"><QrCode size={20}/></div>
                   <div>
                     <div className="text-xs font-bold text-tp-text">Phiên bản 2.0</div>
                     <div className="text-[10px] text-tp-subtext">Coming Soon</div>
                   </div>
                </div>
              </div>

              {/* Mobile mockup next to PC */}
              <div className="hidden lg:flex w-[300px] h-full shrink-0 relative items-center justify-center">
                 <div className="w-full relative aspect-[9/19.5] bg-gray-900 rounded-[2.5rem] border-[10px] border-gray-900 shadow-2xl overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-500">
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-3xl z-20"></div>
                   <img 
                    src="/screenshots/webapp_mobile.jpg" 
                    alt="TichPhong Share Mobile WebApp" 
                    className="w-full h-full object-cover opacity-95 hover:opacity-100 transition-opacity"
                  />
                 </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="py-24 relative z-10 bg-gradient-to-b from-transparent to-white/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 relative z-10">
            <div className="text-tp-primary font-bold uppercase tracking-widest text-sm mb-3">Tính năng toàn diện</div>
            <h2 className="text-4xl md:text-5xl font-black text-tp-text mb-6 tracking-tight ">Giải pháp <span className="text-gradient font-charm font-bold">hoàn hảo</span> cho bạn</h2>
            <p className="text-xl text-tp-subtext max-w-2xl mx-auto font-medium">Được phát triển với mục tiêu thay thế hoàn toàn cáp truyền dữ liệu truyền thống.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: QrCode, title: 'QR Connect (V2.0)', desc: 'Tính năng sắp ra mắt: Dùng camera điện thoại quét mã QR trên PC và gửi/nhận file trực tiếp qua trình duyệt web trên di động không cần cài app.' },
              { icon: Zap, title: 'Tốc Độ Ánh Sáng', desc: 'Khai thác tối đa băng thông mạng LAN của bạn. Chuyển tệp tin hàng Gigabyte chỉ trong vài giây, nhanh hơn chục lần so với Bluetooth.' },
              { icon: MonitorSmartphone, title: 'Tương Thích Cao', desc: 'Hỗ trợ kết nối với các thiết bị Android, Windows qua chuẩn Quick Share (Nearby Connections) & LocalSend.' },
              { icon: WifiOff, title: 'Hoạt Động Offline', desc: 'Không cần kết nối Internet. Chỉ cần các thiết bị ở chung một mạng Wi-Fi, cáp LAN, hoặc thậm chí là phát Hotspot từ điện thoại.' },
              { icon: Shield, title: 'Bảo Mật Cục Bộ', desc: 'Mã hóa đầu cuối TLS vững chắc. Dữ liệu truyền trực tiếp P2P giữa các thiết bị, không đi qua máy chủ đám mây.' },
              { icon: Rocket, title: 'Tối Ưu & Siêu Nhẹ', desc: 'Xây dựng trên nền tảng Rust và Tauri v2, ngốn cực ít RAM (dưới 50MB) và chạy mượt mà ngay cả trên PC đời cũ.' }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ y: 40, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 50 }}
                className="glass-card p-10 rounded-[2rem] group bg-white/60 hover:bg-white transition-colors duration-300"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-tp-primary/10 to-tp-accent/10 border border-white/80 shadow-sm rounded-2xl flex items-center justify-center mb-8 text-tp-primary group-hover:scale-110 transition-transform duration-300">
                  <feature.icon size={32} />
                </div>
                <h3 className="text-2xl font-bold text-tp-text mb-4 tracking-tight ">{feature.title}</h3>
                <p className="text-tp-subtext leading-relaxed font-medium">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative z-10 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-tp-primary font-bold uppercase tracking-widest text-sm mb-3">Dễ sử dụng</div>
            <h2 className="text-4xl md:text-5xl font-black text-tp-text mb-6 ">Chỉ với 3 bước <span className="font-charm text-tp-primary">đơn giản</span></h2>
            <p className="text-lg text-tp-subtext max-w-2xl mx-auto font-medium">Bạn không cần phải thiết lập phức tạp, ứng dụng tự động dò tìm thiết bị xung quanh.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 relative max-w-5xl mx-auto">
            {/* Connecting lines for desktop */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-tp-primary/10 via-tp-primary/30 to-tp-primary/10 -z-10"></div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-tp-base border-8 border-white shadow-xl flex items-center justify-center text-3xl font-black text-tp-primary mb-6 z-10 relative">
                1
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-blue-500">
                  <Wifi size={20} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-tp-text mb-3 ">Kết nối mạng</h3>
              <p className="text-tp-subtext">Đảm bảo máy tính và điện thoại của bạn đang kết nối vào chung một mạng Wi-Fi (hoặc phát Hotspot).</p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-tp-base border-8 border-white shadow-xl flex items-center justify-center text-3xl font-black text-tp-primary mb-6 z-10 relative">
                2
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-green-500">
                  <MonitorSmartphone size={20} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-tp-text mb-3 ">Mở Ứng Dụng</h3>
              <p className="text-tp-subtext">Khởi chạy TichPhong Share. Ứng dụng sẽ tự động phát hiện các thiết bị lân cận đang mở app tương tự.</p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-tp-base border-8 border-white shadow-xl flex items-center justify-center text-3xl font-black text-tp-primary mb-6 z-10 relative">
                3
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-tp-accent">
                  <Share2 size={20} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-tp-text mb-3 ">Kéo & Thả</h3>
              <p className="text-tp-subtext">Chọn thiết bị, kéo thả file vào cửa sổ. File sẽ bay tới đích với tốc độ cực nhanh trong chớp mắt.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 relative z-10 bg-tp-base">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-tp-text mb-4 ">Câu hỏi thường gặp</h2>
            <p className="text-tp-subtext font-medium">Những vấn đề người dùng hay thắc mắc nhất</p>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="glass-card rounded-2xl overflow-hidden bg-white/50">
                <button 
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 text-left font-bold text-tp-text flex justify-between items-center hover:text-tp-primary transition-colors"
                >
                  <span className="text-lg">{faq.q}</span>
                  <div className={`transform transition-transform duration-300 ${activeFaq === idx ? 'rotate-180' : ''}`}>
                    <ArrowRight size={20} className="rotate-90" />
                  </div>
                </button>
                <div 
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${activeFaq === idx ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <p className="text-tp-subtext font-medium leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download Section CTA */}
      <section id="download" className="py-24 relative z-10 bg-tp-base overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-tp-primary/5 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="glass-card rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden bg-white/80 border-white">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-tp-primary/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-tp-accent/10 rounded-full blur-3xl"></div>
            
            <h2 className="text-4xl md:text-5xl font-black text-tp-text mb-6 ">Sẵn sàng <span className="font-charm text-tp-primary">trải nghiệm?</span></h2>
            <p className="text-xl text-tp-subtext mb-12 max-w-2xl mx-auto font-medium">
              Tải xuống bản ổn định ngay hôm nay, hoặc đón chờ phiên bản 2.0.0 cực khủng với tính năng QR Connect.
            </p>
            
            <div className="flex flex-col md:flex-row justify-center gap-6">
              <a href="https://github.com/doccosau/TichPhong-Share/releases/latest" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-8 py-5 rounded-2xl bg-tp-text text-white hover:scale-105 transition-transform shadow-xl shadow-tp-text/20 group">
                <Monitor size={32} className="group-hover:text-tp-accent transition-colors" />
                <div className="text-left">
                  <div className="text-sm text-gray-300">Tải cho hệ điều hành</div>
                  <div className="font-bold text-xl">Windows (.exe)</div>
                </div>
              </a>
              <a href="https://github.com/doccosau/TichPhong-Share/releases/latest" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-8 py-5 rounded-2xl bg-gradient-to-r from-tp-primary to-tp-secondary text-white hover:scale-105 transition-transform shadow-xl shadow-tp-primary/30 group">
                <Terminal size={32} className="group-hover:rotate-12 transition-transform" />
                <div className="text-left">
                  <div className="text-sm text-white/80">Tải cài đặt (.deb / .rpm)</div>
                  <div className="font-bold text-xl">Linux / TichPhong OS</div>
                </div>
              </a>
            </div>
            
            <div className="mt-8 flex justify-center gap-4">
              <div className="px-6 py-3 rounded-xl bg-yellow-500/10 text-yellow-700 font-bold border border-yellow-500/20 flex items-center gap-2">
                 <Package size={18} />
                 Bản V2.0.0 (QR Connect) đang được hoàn thiện, Coming Soon!
              </div>
            </div>
            
            <div className="mt-12 flex justify-center items-center gap-2 text-sm text-tp-subtext font-medium">
              <Check size={16} className="text-tp-primary" /> Hỗ trợ Windows 10+ và các bản phối Linux mới.
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-tp-primary/10 pt-20 pb-12 glass relative z-10 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <img src="/logo.png" alt="TichPhong Share Logo" className="w-10 h-10 drop-shadow-md rounded-xl" />
                <span className="text-2xl font-black text-tp-text tracking-tight ">TichPhong Share</span>
              </div>
              <p className="text-tp-subtext font-medium mb-6 max-w-sm">Phần mềm chia sẻ dữ liệu mã nguồn mở miễn phí. Tiên phong giải pháp P2P tốc độ cao và bảo mật nội bộ do cộng đồng TichPhong OS đóng góp.</p>
              <div className="flex gap-4">
                <a href="https://github.com/doccosau/TichPhong-Share" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-tp-base flex items-center justify-center text-tp-subtext hover:text-tp-primary hover:bg-tp-primary/10 transition-colors shadow-sm">
                  <Code size={20} />
                </a>
                <a href="https://tichphongthienson.info.vn" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-tp-base flex items-center justify-center text-tp-subtext hover:text-tp-primary hover:bg-tp-primary/10 transition-colors shadow-sm">
                  <Globe size={20} />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-tp-text mb-6 uppercase tracking-wider text-sm">Tài nguyên</h4>
              <ul className="space-y-4 text-tp-subtext font-medium">
                <li><a href="https://github.com/doccosau/TichPhong-Share/releases" className="hover:text-tp-primary transition-colors flex items-center gap-2"><ArrowRight size={14}/> Tải xuống bản ổn định</a></li>
                <li><a href="https://github.com/doccosau/TichPhong-Share/issues" className="hover:text-tp-primary transition-colors flex items-center gap-2"><ArrowRight size={14}/> Báo cáo lỗi (Issues)</a></li>
                <li><a href="https://github.com/doccosau/TichPhong-Share" className="hover:text-tp-primary transition-colors flex items-center gap-2"><ArrowRight size={14}/> Mã nguồn GitHub</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-tp-text mb-6 uppercase tracking-wider text-sm">Pháp lý & Chính sách</h4>
              <ul className="space-y-4 text-tp-subtext font-medium">
                <li><a href="/terms.html" className="hover:text-tp-primary transition-colors flex items-center gap-2"><ArrowRight size={14}/> Điều khoản Dịch vụ</a></li>
                <li><a href="/privacy.html" className="hover:text-tp-primary transition-colors flex items-center gap-2"><ArrowRight size={14}/> Chính sách Bảo mật</a></li>
                <li><a href="https://github.com/doccosau/TichPhong-Share/pulls" className="hover:text-tp-primary transition-colors flex items-center gap-2"><ArrowRight size={14}/> Hỗ trợ đóng góp</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-tp-primary/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm font-semibold text-tp-subtext/80 text-center md:text-left">
              © {new Date().getFullYear()} TichPhong OS Team. Mọi quyền được bảo lưu.<br/>
              <span className="font-normal mt-1 block">
                TichPhong Direct & Quick Share (rqs) được cấp phép <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer" className="hover:text-tp-primary transition-colors underline">GNU GPLv3</a>. 
                Tương thích nền tảng <a href="https://github.com/localsend/localsend" target="_blank" rel="noopener noreferrer" className="hover:text-tp-primary transition-colors underline">LocalSend</a> (Apache 2.0).
              </span>
            </div>
            <div className="text-sm font-semibold text-tp-subtext/80 flex items-center gap-1">
              Phát triển với <Heart size={14} className="text-red-500 mx-1 inline animate-pulse" /> bởi cộng đồng mã nguồn mở.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
