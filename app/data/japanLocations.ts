export interface JapanLocation {
  value: string;
  label: string;
  flag: string;
  latlng: [number, number];
  region: string;
  prefectureCode: string;
  prefecture: string;
  cityCode: string;
  city: string;
  stationCode: string;
  station: string;
}

const location = (
  value: string,
  prefectureCode: string,
  prefecture: string,
  cityCode: string,
  city: string,
  stationCode: string,
  station: string,
  latlng: [number, number],
): JapanLocation => ({
  value,
  label: `${station}站`,
  flag: "🚉",
  latlng,
  region: `${prefecture}・${city}`,
  prefectureCode,
  prefecture,
  cityCode,
  city,
  stationCode,
  station: `${station}站`,
});

// Curated MVP set. Stable internal codes let us expand the catalogue later
// without changing existing listing records.
export const japanLocations: JapanLocation[] = [
  location("tokyo-shinjuku", "13", "東京都", "13104", "新宿區", "JY17", "新宿", [35.6909, 139.7003]),
  location("tokyo-shibuya", "13", "東京都", "13113", "澀谷區", "JY20", "澀谷", [35.658, 139.7016]),
  location("tokyo-ueno", "13", "東京都", "13106", "台東區", "JY05", "上野", [35.7141, 139.7774]),
  location("osaka-umeda", "27", "大阪府", "27127", "大阪市北區", "HK01", "大阪梅田", [34.7055, 135.4983]),
  location("osaka-namba", "27", "大阪府", "27111", "大阪市浪速區", "NK01", "難波", [34.6628, 135.5019]),
  location("kyoto-kyoto", "26", "京都府", "26106", "京都市下京區", "JR-A31", "京都", [34.9858, 135.7588]),
  location("fukuoka-hakata", "40", "福岡縣", "40132", "福岡市博多區", "JR-00", "博多", [33.5898, 130.4207]),
  location("fukuoka-tenjin", "40", "福岡縣", "40133", "福岡市中央區", "K08", "天神", [33.5904, 130.4017]),
  location("hokkaido-sapporo", "01", "北海道", "01101", "札幌市中央區", "01", "札幌", [43.0687, 141.3508]),
  location("aichi-nagoya", "23", "愛知縣", "23105", "名古屋市中村區", "CA68", "名古屋", [35.1709, 136.8815]),
  location("kanagawa-yokohama", "14", "神奈川縣", "14103", "橫濱市西區", "JT05", "橫濱", [35.4658, 139.6223]),
  location("hyogo-sannomiya", "28", "兵庫縣", "28110", "神戶市中央區", "JR-A61", "三宮", [34.6946, 135.1955]),
];
