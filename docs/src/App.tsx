import { motion, type Variants } from 'framer-motion';
import { Share2, Zap, Shield, Globe2, ArrowRight, Download } from 'lucide-react';
import './index.css';

export default function App() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen bg-tp-base text-tp-text selection:bg-tp-primary/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tp-primary to-tp-secondary flex items-center justify-center shadow-lg shadow-tp-primary/20">
              <Share2 size={24} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">TichPhong Share</span>
          </div>
          <a href="#download" className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all font-medium text-sm border border-white/5 flex items-center gap-2">
            <Download size={16} />
            Tải Ngay
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-tp-primary/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-tp-secondary/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-center max-w-4xl mx-auto mt-20"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-tp-secondary/10 border border-tp-secondary/20 text-tp-secondary text-sm font-semibold mb-8">
              <Zap size={16} />
              <span>Giao thức LocalSend & Quick Share</span>
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8 leading-[1.1]">
              Chia sẻ dữ liệu{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-tp-primary to-tp-secondary">
                Không giới hạn.
              </span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-xl text-tp-subtext mb-12 max-w-2xl mx-auto leading-relaxed">
              Ứng dụng truyền tải file đa nền tảng mã nguồn mở, siêu tốc độ. Gửi tệp, thư mục và văn bản giữa các thiết bị mà không cần internet.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#download" className="px-8 py-4 rounded-2xl bg-tp-primary hover:bg-pink-600 text-white font-semibold transition-all shadow-lg shadow-tp-primary/25 flex items-center gap-2 w-full sm:w-auto justify-center">
                <Download size={20} />
                Tải cho Linux
              </a>
              <a href="https://github.com/doccosau/TichPhong-Share" target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all border border-white/10 flex items-center gap-2 w-full sm:w-auto justify-center">
                Mã nguồn GitHub
                <ArrowRight size={20} />
              </a>
            </motion.div>
          </motion.div>

          {/* App Preview Mockup */}
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 60 }}
            className="mt-24 relative max-w-5xl mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-tp-base via-transparent to-transparent z-20" />
            <div className="glass-card rounded-[2rem] p-4 border border-white/10 overflow-hidden shadow-2xl relative z-10">
              <div className="bg-tp-surface rounded-[1.5rem] overflow-hidden aspect-[16/10] relative flex items-center justify-center">
                <img 
                  src="/screenshots/app-ui-1.png" 
                  alt="TichPhong Share Interface" 
                  className="w-full h-full object-cover rounded-[1.5rem]"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Được thiết kế để tối ưu trải nghiệm</h2>
            <p className="text-lg text-tp-subtext max-w-2xl mx-auto">Không cần thiết lập rườm rà. Chỉ cần mở ứng dụng là có thể gửi và nhận file tức thì với mọi thiết bị trong mạng.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'Siêu Tốc Độ', desc: 'Sử dụng toàn bộ băng thông mạng LAN của bạn. Nhanh hơn gấp nhiều lần so với Bluetooth hay chia sẻ qua Cloud.' },
              { icon: Globe2, title: 'Đa Nền Tảng', desc: 'Tương thích hoàn hảo với Android (LocalSend/Quick Share), Windows, macOS, iOS và Linux.' },
              { icon: Shield, title: 'An Toàn Tuyệt Đối', desc: 'Truyền tải mã hóa P2P nội bộ. Không đi qua máy chủ trung gian. Dữ liệu của bạn không bao giờ rời khỏi mạng LAN.' }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-8 rounded-3xl"
              >
                <div className="w-14 h-14 bg-tp-primary/10 rounded-2xl flex items-center justify-center mb-6 text-tp-primary">
                  <feature.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-tp-subtext leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 mt-12 bg-tp-overlay/50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
             <Share2 size={24} className="text-tp-primary" />
             <span className="text-xl font-bold text-white">TichPhong Share</span>
          </div>
          <p className="text-tp-subtext mb-6">Xây dựng với ❤️ bởi đội ngũ TichPhong OS</p>
          <div className="text-sm text-tp-subtext/60">
            © 2026 TichPhong OS. Đã đăng ký bản quyền.
          </div>
        </div>
      </footer>
    </div>
  );
}
