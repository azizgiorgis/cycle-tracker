// src/CalendarLogic.ts

// App.tsx'den tip tanımını alıyoruz
interface CycleSettings {
    cycleLength: number; 
    periodLength: number; 
}

// Yardımcı Fonksiyon: Bir Tarihe Gün Ekleme
const addDays = (date: Date, days: number): Date => {
  const newDate = new Date(date);
  newDate.setDate(date.getDate() + days);
  return newDate;
};

// 🩸 Döngü Tahminlerini Hesaplayan Ana Fonksiyon
export const calculateCyclePredictions = (
  lastPeriodDate: string, // ISO formatı: YYYY-MM-DD
  settings: CycleSettings
) => {
  if (!lastPeriodDate || settings.cycleLength <= 0 || settings.periodLength <= 0) return null;

  // Son regl tarihini Date objesine çevir
  const lastPeriod = new Date(lastPeriodDate);
  
  // Eğer tarih geçerli değilse
  if (isNaN(lastPeriod.getTime())) return null;


  // 1. Sonraki Regl Başlangıç Tahmini
  // Son regl tarihi + Döngü Uzunluğu
  const nextPeriodStart = addDays(lastPeriod, settings.cycleLength);
  
  // 2. Regl Bitiş Tahmini
  // Sonraki regl başlangıcı + Regl Süresi (bitişi dahil etmek için -1)
  const nextPeriodEnd = addDays(nextPeriodStart, settings.periodLength - 1); 
  
  // 3. Yumurtlama (Ovülasyon) Tahmini
  // Yumurtlama genellikle bir sonraki regl tarihinden 14 gün önce olur.
  // Bu mantık çoğu uygulama tarafından kullanılır.
  const ovulationDay = addDays(nextPeriodStart, -14);
  
  // 4. Doğurgan Pencere Tahmini
  // Doğurganlık penceresi, ovülasyon tarihinden 5 gün öncesi (6 gün) başlar ve ovülasyonun ertesi günü biter.
  const fertileWindowStart = addDays(ovulationDay, -5); 
  const fertileWindowEnd = addDays(ovulationDay, 1); 

  // Tahminleri YYYY-MM-DD formatında dışa aktar
  const formatDate = (date: Date): string => date.toISOString().split('T')[0];

  return {
    nextPeriodStart: formatDate(nextPeriodStart),
    nextPeriodEnd: formatDate(nextPeriodEnd),
    ovulationDay: formatDate(ovulationDay),
    fertileWindowStart: formatDate(fertileWindowStart),
    fertileWindowEnd: formatDate(fertileWindowEnd),
    cycleLength: settings.cycleLength,
  };
};
