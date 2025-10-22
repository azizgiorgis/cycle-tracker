import React, { useState, useEffect } from 'react';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { getFirestore, Firestore, collection, doc, setDoc, onSnapshot, query, getDoc, deleteDoc } from 'firebase/firestore'; 
import { calculateCyclePredictions } from './CalendarLogic';
import { firebaseConfig } from './firebaseConfig';

declare const __app_id: string | undefined;
declare const __initial_auth_token: string | undefined;

interface CycleSettings {
  cycleLength: number; 
  periodLength: number; 
}

interface PeriodRecord {
  date: string;
  timestamp: number;
}

type PeriodDates = PeriodRecord[]; 

interface Prediction {
  nextPeriodStart: string;
  nextPeriodEnd: string;
  ovulationDay: string;
  fertileWindowStart: string;
  fertileWindowEnd: string;
  cycleLength: number;
}

interface UserProfile {
  name: string;
  email: string;
  createdAt: number;
}
const DEFAULT_SETTINGS: CycleSettings = {
  cycleLength: 28, 
  periodLength: 5,
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'cycle-tracker-default';

const formatDateTurkish = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`;
};

const getDaysUntil = (dateString: string): number => {
  const targetDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const CustomAlert: React.FC<{ message: string; type: 'error' | 'info' | 'success'; onClose: () => void }> = ({ message, type, onClose }) => {
  const baseClasses = "p-3 rounded-lg shadow-md mb-4 flex justify-between items-center";
  let typeClasses = "";

  switch (type) {
    case 'error':
      typeClasses = "bg-red-100 border border-red-400 text-red-700";
      break;
    case 'info':
      typeClasses = "bg-blue-100 border border-blue-400 text-blue-700";
      break;
    case 'success':
      typeClasses = "bg-green-100 border border-green-400 text-green-700";
      break;
  }

  return (
    <div className={`${baseClasses} ${typeClasses}`} role="alert">
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="text-xl font-semibold ml-4">&times;</button>
    </div>
  );
};

/**
 * Oturum Açma ve Kayıt Olma Bileşeni
 */
const AuthPage: React.FC<{ 
  auth: Auth | null, 
  db: Firestore | null,
  setErrorMessage: (msg: string) => void, 
  setIsLoading: (loading: boolean) => void 
}> = ({ auth, db, setErrorMessage, setIsLoading }) => {
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const translateFirebaseError = (code: string): string => {
        switch (code) {
            case 'auth/email-already-in-use':
                return 'Bu e-posta adresi zaten kullanılıyor.';
            case 'auth/invalid-email':
                return 'Geçersiz e-posta formatı.';
            case 'auth/operation-not-allowed':
                return 'E-posta/Şifre ile giriş devre dışı.';
            case 'auth/weak-password':
                return 'Şifre en az 6 karakter olmalıdır.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Geçersiz e-posta veya şifre.';
            default:
                return 'Bilinmeyen bir hata oluştu. Lütfen tekrar deneyin.';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        if (!auth || !db) {
            setErrorMessage('Uygulama henüz başlatılmadı.');
            return;
        }

        if (password.length < 6) {
            setErrorMessage('Şifre en az 6 karakter olmalıdır.');
            return;
        }

        setIsLoading(true);

        try {
            if (authMode === 'register') {
                if (!name.trim()) {
                  setErrorMessage('Lütfen adınızı ve soyadınızı girin.');
                  setIsLoading(false);
                  return;
                }
                
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const userId = userCredential.user.uid;
                
                const userProfileRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'info');
                const userProfile: UserProfile = {
                  name: name.trim(),
                  email: email,
                  createdAt: Date.now()
                };
                await setDoc(userProfileRef, userProfile);
                
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error: any) {
            console.error("Kimlik doğrulama hatası:", error);
            setErrorMessage(translateFirebaseError(error.code));
        } finally {
            setIsLoading(false); 
        }
    };

    const isLogin = authMode === 'login';

    return (
        <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-2xl">
            <h2 className="text-3xl font-bold text-pink-700 text-center mb-6">
                {isLogin ? 'Oturum Aç' : 'Yeni Kayıt'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                
                {!isLogin && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adınız Soyadınız</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 border border-pink-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 transition"
                            placeholder="Ad Soyad"
                            required={!isLogin}
                        />
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 border border-pink-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 transition"
                        placeholder="email@example.com"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Şifre (min. 6 karakter)</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 border border-pink-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 transition"
                        placeholder="******"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-lg shadow-lg transition duration-200 transform hover:scale-[1.01]"
                >
                    {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                </button>
            </form>
            <button
                onClick={() => setAuthMode(isLogin ? 'register' : 'login')}
                className="w-full mt-4 text-sm text-pink-500 hover:text-pink-700 transition"
            >
                {isLogin ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
            </button>
        </div>
    );
};

function App() {
  // Firebase State'leri
  const [app, setApp] = useState<FirebaseApp | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false); 
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false); 

  // Uygulama State'leri
  const [settings, setSettings] = useState<CycleSettings>(DEFAULT_SETTINGS);
  const [periodDates, setPeriodDates] = useState<PeriodDates>([]); 
  const [lastPeriodDate, setLastPeriodDate] = useState<string>(''); 
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>(''); 

  // =========================================================================
  // 1. FIREBASE BAŞLATMA VE OTURUM AÇMA
  // =========================================================================
  useEffect(() => {
    try {
        if (!firebaseConfig) {
            console.error("Firebase konfigürasyonu bulunamadı.");
            setErrorMessage("Uygulama, Firebase konfigürasyonu olmadan çalışamaz.");
            setIsLoading(false); 
            setIsAuthReady(true);
            return;
        }

        const initializedApp = initializeApp(firebaseConfig);
        const authInstance = getAuth(initializedApp);
        const dbInstance = getFirestore(initializedApp);

        setApp(initializedApp);
        setAuth(authInstance);
        setDb(dbInstance);

        let isMounted = true;

        const unsubscribe = onAuthStateChanged(authInstance, (user) => {
            if (!isMounted) return;

            if (user) {
                setUserId(user.uid);
                setIsAnonymous(user.isAnonymous); 
                console.log("Kullanıcı Oturum Açtı:", user.uid, user.isAnonymous ? "(Anonim)" : "(Kayıtlı)");
            } else {
                setUserId(null);
                setIsAnonymous(false);
                setUserName('');
            }
            
            setIsLoading(false);
            setIsAuthReady(true);
        });
        
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        if (token) {
            signInWithCustomToken(authInstance, token).catch(err => {
                console.error("Custom token ile oturum açma hatası:", err);
            });
        }

        return () => {
            isMounted = false;
            unsubscribe(); 
        }; 
    } catch (e) {
        console.error("Firebase başlatma hatası:", e);
        setErrorMessage("Firebase başlatma sırasında kritik hata oluştu.");
        setIsLoading(false);
        setIsAuthReady(true);
    }
  }, []);

  // =========================================================================
  // 2. KULLANICI PROFİLİNİ ÇEKME
  // =========================================================================
  useEffect(() => {
    if (!db || !userId || isAnonymous || !isAuthReady) {
      return;
    }

    const userProfileRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'info');
    
    const fetchUserProfile = async () => {
      try {
        const docSnap = await getDoc(userProfileRef);
        if (docSnap.exists()) {
          const profile = docSnap.data() as UserProfile;
          setUserName(profile.name);
        }
      } catch (error) {
        console.error("Kullanıcı profili yüklenirken hata oluştu:", error);
      }
    };

    fetchUserProfile();
  }, [db, userId, isAnonymous, isAuthReady]);

  // =========================================================================
  // 3. VERİ ÇEKME
  // =========================================================================
  useEffect(() => {
    if (!db || !userId || isAnonymous || !isAuthReady) {
      return; 
    }
    
    const SETTINGS_DOC_REF = doc(db, 'artifacts', appId, 'users', userId, 'config', 'settings');
    const DATES_COLLECTION_REF = collection(db, 'artifacts', appId, 'users', userId, 'periods');

    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(SETTINGS_DOC_REF);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as CycleSettings);
        } else {
          await setDoc(SETTINGS_DOC_REF, DEFAULT_SETTINGS);
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.error("Ayarlar yüklenirken hata oluştu:", error);
      }
    };

    const q = query(DATES_COLLECTION_REF);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const datesList: PeriodRecord[] = [];
      snapshot.forEach((d) => {
        datesList.push(d.data() as PeriodRecord);
      });
      datesList.sort((a, b) => b.timestamp - a.timestamp); 
      setPeriodDates(datesList);
    }, (error) => {
      console.error("Tarihler dinlenirken hata oluştu:", error);
    });

    fetchSettings();

    return () => unsubscribe();
  }, [db, userId, isAnonymous, isAuthReady]);

  // =========================================================================
  // 4. TAHMİN HESAPLAMA
  // =========================================================================
  useEffect(() => {
    if (periodDates.length > 0) {
      const lastDate = periodDates[0].date;
      const result = calculateCyclePredictions(lastDate, settings);
      setPrediction(result);
    } else {
      setPrediction(null);
    }
  }, [periodDates, settings]);

  // =========================================================================
  // FONKSİYONLAR
  // =========================================================================
  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!db || !userId || isAnonymous) {
        setErrorMessage("Bu işlem için kayıtlı bir oturum açmanız gerekiyor.");
        return;
    }
    
    const dateExists = periodDates.some(record => record.date === lastPeriodDate);

    if (!lastPeriodDate || dateExists) {
      setErrorMessage("Lütfen geçerli ve daha önce kaydedilmemiş bir tarih girin.");
      return;
    }

    try {
      const newRecord: PeriodRecord = {
        date: lastPeriodDate,
        timestamp: new Date(lastPeriodDate).getTime(),
      };
      
      const DATES_COLLECTION_REF = collection(db, 'artifacts', appId, 'users', userId, 'periods');
      const docRef = doc(DATES_COLLECTION_REF, lastPeriodDate); 
      await setDoc(docRef, newRecord);

      setLastPeriodDate('');
    } catch (error) {
      console.error("Tarih kaydı sırasında hata oluştu:", error);
      setErrorMessage("Kayıt sırasında bir hata oluştu.");
    }
  };

  const handleSettingsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newValue = parseInt(value) || 0;
    
    if (!db || !userId || isAnonymous) {
        setErrorMessage("Bu işlem için kayıtlı bir oturum açmanız gerekiyor.");
        return;
    }

    const newSettings = {
      ...settings,
      [name]: newValue
    };
    
    setSettings(newSettings);

    try {
      const SETTINGS_DOC_REF = doc(db, 'artifacts', appId, 'users', userId, 'config', 'settings');
      await setDoc(SETTINGS_DOC_REF, newSettings);
      
    } catch (error) {
      console.error("Ayarlar kaydı sırasında hata oluştu:", error);
      setErrorMessage("Ayarlar kaydedilirken hata oluştu.");
    }
  };

  const handleDeleteDate = async (dateToDelete: string) => {
      setErrorMessage('');
      if (!db || !userId || isAnonymous) {
          setErrorMessage("Bu işlem için kayıtlı bir oturum açmanız gerekiyor.");
          return;
      }

      const confirmDelete = window.confirm(`Emin misiniz? ${formatDateTurkish(dateToDelete)} kaydı silinecek.`);
      if (!confirmDelete) return;

      try {
          const DATES_COLLECTION_REF = collection(db, 'artifacts', appId, 'users', userId, 'periods');
          const docRef = doc(DATES_COLLECTION_REF, dateToDelete);
          await deleteDoc(docRef);
      } catch (error) {
          console.error("Kayıt silinirken hata oluştu:", error);
          setErrorMessage("Kayıt silinirken hata oluştu.");
      }
  };

  const handleSignOut = async () => {
      setErrorMessage('');
      if (auth) {
          try {
              await signOut(auth);
          } catch (error) {
              console.error("Oturum kapatma hatası:", error);
              setErrorMessage("Oturum kapatılırken bir hata oluştu.");
          }
      }
  };

  // =========================================================================
  // EKRAN GÖRÜNÜMÜ YÖNETİMİ
  // =========================================================================
  if (isLoading || !isAuthReady) {
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center">
        <div className="text-pink-600 text-xl font-semibold p-4 rounded-lg bg-white shadow-md animate-pulse">
          Uygulama Yükleniyor...
        </div>
      </div>
    );
  }

  if (!userId || isAnonymous) {
    return (
        <div className="min-h-screen bg-pink-50 flex flex-col items-center justify-center p-4">
            {errorMessage && <CustomAlert message={errorMessage} type="error" onClose={() => setErrorMessage('')} />}
            <AuthPage 
              auth={auth}
              db={db}
              setErrorMessage={setErrorMessage}
              setIsLoading={setIsLoading}
            />
        </div>
    );
  }

  // --- ANA UYGULAMA İÇERİĞİ ---
  const latestPeriod = periodDates.length > 0 ? periodDates[0].date : null;
  const daysUntilPeriod = prediction ? getDaysUntil(prediction.nextPeriodStart) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100">
      
      {/* Header - Mobilde kompakt */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-pink-700">
              🩸 Cycle Tracker
            </h1>
            <p className="text-xs md:text-sm text-gray-600">
              Hoş geldiniz, <span className="font-semibold text-pink-600">{userName || '...'}</span>
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="bg-red-500 hover:bg-red-600 text-white text-xs md:text-sm font-bold py-2 px-3 md:px-4 rounded-full shadow-md transition duration-200"
          >
            Çıkış
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-4">

        {errorMessage && <CustomAlert message={errorMessage} type="error" onClose={() => setErrorMessage('')} />}

        {/* 1. ÖNEMLİ BİLGİLER - EN ÜSTTE */}
        {latestPeriod ? (
          <div className="space-y-4">
            
            {/* Büyük Geri Sayım Kartı */}
            {prediction && daysUntilPeriod !== null && (
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl p-6 shadow-2xl text-white">
                <div className="text-center">
                  <p className="text-sm md:text-base font-medium opacity-90 mb-2">Sonraki Reglinize</p>
                  <div className="text-6xl md:text-7xl font-black mb-2">
                    {daysUntilPeriod > 0 ? daysUntilPeriod : daysUntilPeriod === 0 ? 'BUGÜN' : 'GEÇTİ'}
                  </div>
                  {daysUntilPeriod > 0 && (
                    <p className="text-lg md:text-xl font-semibold">gün kaldı</p>
                  )}
                  <p className="text-sm md:text-base opacity-80 mt-3">
                    📅 {formatDateTurkish(prediction.nextPeriodStart)}
                  </p>
                </div>
              </div>
            )}

            {/* Tahmin Kartları Grid */}
            {prediction && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Yumurtlama */}
                <div className="bg-white rounded-2xl p-5 shadow-lg border-l-4 border-blue-400">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-xs uppercase font-bold text-blue-600 mb-1">Yumurtlama</div>
                      <div className="text-2xl font-bold text-gray-800">
                        {formatDateTurkish(prediction.ovulationDay)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {getDaysUntil(prediction.ovulationDay)} gün sonra
                      </div>
                    </div>
                    <div className="text-3xl">🥚</div>
                  </div>
                </div>

                {/* Doğurgan Pencere */}
                <div className="bg-white rounded-2xl p-5 shadow-lg border-l-4 border-green-400">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-xs uppercase font-bold text-green-600 mb-1">Doğurgan Pencere</div>
                      <div className="text-lg font-bold text-gray-800">
                        {formatDateTurkish(prediction.fertileWindowStart)}
                      </div>
                      <div className="text-sm text-gray-600">
                        → {formatDateTurkish(prediction.fertileWindowEnd)}
                      </div>
                    </div>
                    <div className="text-3xl">💚</div>
                  </div>
                </div>

              </div>
            )}

            {/* En Son Kayıt Bilgisi */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-pink-700">Son Kayıt:</span> {formatDateTurkish(latestPeriod)}
              </p>
            </div>

          </div>
        ) : (
          /* İlk Kullanım Mesajı */
          <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl p-8 text-center shadow-lg">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Başlayalım!</h3>
            <p className="text-gray-600">İlk regl tarihinizi aşağıya girerek başlayın.</p>
          </div>
        )}

        {/* 2. TARİH GİRİŞ FORMU */}
        <div className="bg-white rounded-2xl p-5 shadow-lg">
          <h2 className="text-lg font-bold text-pink-600 mb-4 flex items-center">
            <span className="mr-2">➕</span> Yeni Tarih Ekle
          </h2>
          <form onSubmit={handleSavePeriod} className="flex flex-col sm:flex-row gap-3">
            <input
              type="date"
              value={lastPeriodDate}
              onChange={(e) => setLastPeriodDate(e.target.value)}
              required
              className="flex-1 p-3 border border-pink-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition"
            />
            <button
              type="submit"
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition duration-200 whitespace-nowrap"
            >
              Kaydet
            </button>
          </form>
        </div>

        {/* 3. AYARLAR */}
        <div className="bg-white rounded-2xl p-5 shadow-lg">
          <h2 className="text-lg font-bold text-pink-600 mb-4 flex items-center">
            <span className="mr-2">⚙️</span> Ayarlar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Döngü Uzunluğu (gün)
              </label>
              <input
                type="number"
                name="cycleLength"
                value={settings.cycleLength}
                onChange={handleSettingsChange}
                min="20"
                max="45"
                className="w-full p-3 border border-pink-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Regl Süresi (gün)
              </label>
              <input
                type="number"
                name="periodLength"
                value={settings.periodLength}
                onChange={handleSettingsChange}
                min="2"
                max="10"
                className="w-full p-3 border border-pink-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition"
              />
            </div>

          </div>
        </div>

        {/* 4. TARİH GEÇMİŞİ */}
        <div className="bg-white rounded-2xl p-5 shadow-lg">
          <h2 className="text-lg font-bold text-pink-600 mb-4 flex items-center">
            <span className="mr-2">📋</span> Geçmiş Kayıtlar ({periodDates.length})
          </h2>
          {periodDates.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {periodDates.map(record => (
                <div key={record.date} className="bg-pink-50 px-3 py-2 rounded-xl flex items-center justify-between shadow-sm border border-pink-100">
                  <span className="text-sm font-medium text-pink-800">
                    {formatDateTurkish(record.date)}
                  </span>
                  <button 
                    onClick={() => handleDeleteDate(record.date)}
                    className="text-pink-500 hover:text-red-600 text-lg transition duration-150 ml-2"
                    title="Kaydı Sil"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic text-center py-4">
              Henüz kaydedilmiş bir tarih yok.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;