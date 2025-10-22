🩸 Cycle Tracker (Çok Kullanıcılı Döngü Takip Uygulaması)

Bu proje, React ve Tailwind CSS kullanılarak geliştirilmiş, kadınların regl döngülerini ve tahminlerini kişiselleştirilmiş olarak takip etmelerini sağlayan tam fonksiyonlu bir uygulamadır. Tüm veriler, her kullanıcı için ayrı ve güvenli bir şekilde Google Firestore veritabanında saklanmaktadır.

Canlı Versiyon (Live Demo)

Uygulamanın çalışan versiyonuna aşağıdaki linkten ulaşabilirsiniz:
[Cycle Tracker Uygulaması] [\[DEMO LİNK\]](https://cycle-tracker-gules.vercel.app/)

💻 Teknolojiler

React (TypeScript): Kullanıcı arayüzü (UI) ve state yönetimi için

Tailwind CSS: Hızlı ve modern arayüz tasarımı için

Firebase/Firestore: Çok kullanıcılı, gerçek zamanlı veri depolama ve senkronizasyon için

Firebase Auth: Kullanıcıya özel veri izolasyonu (otomatik oturum açma ile)

Vercel: Kolay ve hızlı deployment (yayına alma) platformu

🚀 Başlangıç

Bu projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin.

Ön Koşullar

Node.js (LTS sürümü önerilir)

npm veya yarn

Bir Firebase Projesi (Firestore ve Authentication aktif)

Kurulum Adımları

Projeyi Klonlayın:

git clone [REPO_ADRESİNİZ]
cd cycle-tracker


Bağımlılıkları yükleyin:

npm install


Firebase Konfigürasyonu:
Bu uygulama, özel bir Canvas ortamında çalışmak üzere tasarlandığı için standart .env dosyası kullanmaz. Yerel çalıştırmak için:

Kendi Firebase ayarlarınızı (apiKey, projectId vb.) alın.

src/App.tsx dosyasında, global değişkenlerin kullanıldığı Firebase başlatma bloğunu kendi standart konfigürasyonunuzla değiştirin.

Uygulamayı başlatın:

npm start


Uygulama http://localhost:3000 adresinde açılacaktır.

📝 Özellikler

Kişiye Özel Veri: Her kullanıcının döngü ayarları ve kayıtları Firestore'da kendi userId'si altında izole edilir.

Tahmin Hesaplama: Kayıtlı verilere göre bir sonraki regl başlangıcı, yumurtlama günü ve doğurgan pencere tarihleri hesaplanır.

Kalıcı Kayıt: Girilen tüm döngü başlangıç tarihleri ve ayarlar, veritabanında kalıcı olarak saklanır.

CRUD Yeteneği: Regl başlangıç tarihleri kaydedilebilir ve silinebilir.