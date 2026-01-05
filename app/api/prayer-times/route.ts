import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Default zone for Kajang, Selangor
const DEFAULT_ZONE = 'SGR01';

// JAKIM zone mapping with coordinates (lat, lng) and display name
const JAKIM_ZONES: { code: string; name: string; lat: number; lng: number }[] = [
  // Johor
  { code: 'JHR01', name: 'Pulau Aur dan Pulau Pemanggil', lat: 2.45, lng: 104.52 },
  { code: 'JHR02', name: 'Johor Bahru, Kota Tinggi, Mersing, Kulai', lat: 1.4927, lng: 103.7414 },
  { code: 'JHR03', name: 'Kluang, Pontian', lat: 2.0251, lng: 103.3328 },
  { code: 'JHR04', name: 'Batu Pahat, Muar, Segamat, Gemas', lat: 1.8548, lng: 102.9325 },
  // Kedah
  { code: 'KDH01', name: 'Kota Setar, Kubang Pasu, Pokok Sena', lat: 6.1184, lng: 100.3685 },
  { code: 'KDH02', name: 'Kuala Muda, Yan, Pendang', lat: 5.7571, lng: 100.5044 },
  { code: 'KDH03', name: 'Padang Terap, Sik', lat: 6.1833, lng: 100.7333 },
  { code: 'KDH04', name: 'Baling', lat: 5.6833, lng: 100.9167 },
  { code: 'KDH05', name: 'Bandar Baharu, Kulim', lat: 5.3667, lng: 100.5667 },
  { code: 'KDH06', name: 'Langkawi', lat: 6.35, lng: 99.8 },
  { code: 'KDH07', name: 'Gunung Jerai', lat: 5.7833, lng: 100.4333 },
  // Kelantan
  { code: 'KTN01', name: 'Bachok, Kota Bharu, Machang, Pasir Mas, Pasir Puteh, Tanah Merah, Tumpat, Kuala Krai, Mukim Chiku', lat: 6.1254, lng: 102.2381 },
  { code: 'KTN02', name: 'Gua Musang (Daerah Galas Dan Bertam), Jeli, Jajahan Kecil Lojing', lat: 4.8833, lng: 101.9667 },
  // Melaka
  { code: 'MLK01', name: 'Seluruh Negeri Melaka', lat: 2.1896, lng: 102.2501 },
  // Negeri Sembilan
  { code: 'NGS01', name: 'Tampin, Jempol', lat: 2.4667, lng: 102.2333 },
  { code: 'NGS02', name: 'Jelebu, Kuala Pilah, Rembau', lat: 2.7333, lng: 102.25 },
  { code: 'NGS03', name: 'Port Dickson, Seremban', lat: 2.7297, lng: 101.9381 },
  // Pahang
  { code: 'PHG01', name: 'Pulau Tioman', lat: 2.8167, lng: 104.1667 },
  { code: 'PHG02', name: 'Kuantan, Pekan, Rompin, Muadzam Shah', lat: 3.8077, lng: 103.326 },
  { code: 'PHG03', name: 'Jerantut, Temerloh, Maran, Bera, Chenor, Jengka', lat: 3.9333, lng: 102.3667 },
  { code: 'PHG04', name: 'Bentong, Lipis, Raub', lat: 3.5167, lng: 101.9 },
  { code: 'PHG05', name: 'Genting Highlands, Cameron Highlands', lat: 4.4833, lng: 101.3833 },
  // Perak
  { code: 'PRK01', name: 'Tapah, Slim River, Tanjung Malim', lat: 4.0333, lng: 101.2667 },
  { code: 'PRK02', name: 'Kuala Kangsar, Sg. Siput, Ipoh, Batu Gajah, Kampar', lat: 4.5921, lng: 101.0901 },
  { code: 'PRK03', name: 'Lenggong, Pengkalan Hulu, Grik', lat: 5.1, lng: 100.9667 },
  { code: 'PRK04', name: 'Temengor, Belum', lat: 5.5, lng: 101.3333 },
  { code: 'PRK05', name: 'Kg Gajah, Teluk Intan, Bagan Datuk, Seri Iskandar, Beruas, Parit, Lumut, Sitiawan, Pulau Pangkor', lat: 4.0167, lng: 100.95 },
  { code: 'PRK06', name: 'Selama, Taiping, Bagan Serai, Parit Buntar', lat: 4.85, lng: 100.7333 },
  { code: 'PRK07', name: 'Bukit Larut', lat: 4.8667, lng: 100.7833 },
  // Perlis
  { code: 'PLS01', name: 'Kangar, Padang Besar, Arau', lat: 6.4414, lng: 100.1986 },
  // Pulau Pinang
  { code: 'PNG01', name: 'Seluruh Negeri Pulau Pinang', lat: 5.4164, lng: 100.3327 },
  // Sabah
  { code: 'SBH01', name: 'Bahagian Sandakan (Timur),## Kg. Iban, ## ## Sminimum Kuamut, Bahagian Tawau (Tawau, Balung, Merotai, Kalabakan)', lat: 5.8402, lng: 118.1179 },
  { code: 'SBH02', name: 'Beluran, ## Telupid, Pinangah, Terusan, Kuamut, Bahagian Sandakan (Barat)', lat: 5.6333, lng: 117.4833 },
  { code: 'SBH03', name: 'Lahad Datu, Silabukan, Kunak, Semporna, Tungku, Bahagian Tawau (Utara)', lat: 5.0333, lng: 118.3333 },
  { code: 'SBH04', name: 'Bandar Seri Begawan, Brunei dan Temburong, Limbang (Sarawak)', lat: 4.9, lng: 114.9333 },
  { code: 'SBH05', name: 'Sipitang, Labuan, Menumbok, Kuala Penyu, Beaufort, Papar, Kota Kinabalu', lat: 5.9749, lng: 116.0724 },
  { code: 'SBH06', name: 'Gunung Kinabalu', lat: 6.075, lng: 116.5583 },
  { code: 'SBH07', name: 'Kota Belud, Kota Marudu, Pitas, Kudat, Pulau Banggi', lat: 6.3333, lng: 116.5 },
  { code: 'SBH08', name: 'Pensiangan, Keningau, Tambunan, Nabawan', lat: 5.3333, lng: 116.1667 },
  { code: 'SBH09', name: 'Ranau, Tongod', lat: 5.95, lng: 116.6667 },
  // Sarawak
  { code: 'SWK01', name: 'Limbang, Lawas, Sundar, Trusan', lat: 4.75, lng: 115.0 },
  { code: 'SWK02', name: 'Miri, Niah, Bekenu, Marudi, Sibuti', lat: 4.3995, lng: 113.9914 },
  { code: 'SWK03', name: 'Tatau, Suai, Belaga, Pandan, Kapit, Song, Sebauh, Bintulu', lat: 2.9333, lng: 113.0333 },
  { code: 'SWK04', name: 'Sibu, Mukah, Dalat, Igan, Oya, Balingian, Kanowit, Julau', lat: 2.287, lng: 111.8307 },
  { code: 'SWK05', name: 'Sarikei, Matu, Daro, Bintangor, Rajang', lat: 2.1167, lng: 111.5167 },
  { code: 'SWK06', name: 'Betong, Spaoh, Pusa, Saratok, Roban, Debak', lat: 1.4167, lng: 111.5167 },
  { code: 'SWK07', name: 'Sri Aman, Lingga, Engkelili, Lubok Antu, Pantu', lat: 1.2333, lng: 111.4667 },
  { code: 'SWK08', name: 'Kuching, Bau, Lundu, Sematan, Sebuyau, Simunjan', lat: 1.5497, lng: 110.3441 },
  { code: 'SWK09', name: 'Serian, Tebedu, Balai Ringin', lat: 1.1667, lng: 110.5833 },
  // Selangor
  { code: 'SGR01', name: 'Gombak, Petaling, Sepang, Hulu Langat, Hulu Selangor, Shah Alam', lat: 3.0738, lng: 101.5183 },
  { code: 'SGR02', name: 'Kuala Selangor, Sabak Bernam', lat: 3.35, lng: 101.25 },
  { code: 'SGR03', name: 'Klang, Kuala Langat', lat: 3.0167, lng: 101.45 },
  // Terengganu
  { code: 'TRG01', name: 'Kuala Terengganu, Marang, Kuala Nerus', lat: 5.3117, lng: 103.1324 },
  { code: 'TRG02', name: 'Besut, Setiu', lat: 5.6, lng: 102.55 },
  { code: 'TRG03', name: 'Hulu Terengganu', lat: 5.05, lng: 102.9167 },
  { code: 'TRG04', name: 'Dungun, Kemaman', lat: 4.75, lng: 103.4167 },
  // Wilayah Persekutuan
  { code: 'WLY01', name: 'Kuala Lumpur, Putrajaya', lat: 3.139, lng: 101.6869 },
  { code: 'WLY02', name: 'Labuan', lat: 5.2831, lng: 115.2308 },
];

// Find nearest zone based on coordinates using Haversine formula
function findNearestZone(lat: number, lng: number): { code: string; name: string } {
  let nearestZone = JAKIM_ZONES[0];
  let minDistance = Number.MAX_VALUE;

  for (const zone of JAKIM_ZONES) {
    const distance = haversineDistance(lat, lng, zone.lat, zone.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestZone = zone;
    }
  }

  return { code: nearestZone.code, name: nearestZone.name };
}

// Haversine formula to calculate distance between two coordinates
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const zoneParam = searchParams.get('zone');

    let zone = DEFAULT_ZONE;
    let zoneName = 'Kajang, Selangor';

    // If coordinates provided, find nearest zone
    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      if (!isNaN(latitude) && !isNaN(longitude)) {
        const nearest = findNearestZone(latitude, longitude);
        zone = nearest.code;
        zoneName = nearest.name;
      }
    } else if (zoneParam) {
      // If zone code provided directly
      const foundZone = JAKIM_ZONES.find(z => z.code === zoneParam.toUpperCase());
      if (foundZone) {
        zone = foundZone.code;
        zoneName = foundZone.name;
      }
    }

    // Fetch from JAKIM e-solat API
    const response = await fetch(
      `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=today&zone=${zone}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from JAKIM API');
    }

    const data = await response.json();

    if (data.status === 'OK!' && data.prayerTime && data.prayerTime.length > 0) {
      const todayPrayer = data.prayerTime[0];

      return NextResponse.json({
        Subuh: todayPrayer.fajr,
        Zohor: todayPrayer.dhuhr,
        Asar: todayPrayer.asr,
        Maghrib: todayPrayer.maghrib,
        Isyak: todayPrayer.isha,
        date: todayPrayer.date,
        hijri: todayPrayer.hijri,
        zone: zone,
        zoneName: zoneName
      });
    }

    // Fallback: return empty if API fails
    return NextResponse.json({
      Subuh: '-',
      Zohor: '-',
      Asar: '-',
      Maghrib: '-',
      Isyak: '-',
      zone: zone,
      zoneName: zoneName,
      error: 'Data tidak tersedia'
    });

  } catch (error) {
    console.error('Error fetching prayer times:', error);

    // Return fallback data
    return NextResponse.json({
      Subuh: '-',
      Zohor: '-',
      Asar: '-',
      Maghrib: '-',
      Isyak: '-',
      zone: DEFAULT_ZONE,
      zoneName: 'Kajang, Selangor',
      error: 'Gagal mendapatkan waktu solat'
    });
  }
}
