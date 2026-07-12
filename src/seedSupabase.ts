import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://orevazfyhtaujfxpvzvx.supabase.co";
const SUPABASE_KEY = "sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log("🚀 Bắt đầu gieo dữ liệu mẫu (seeding) vào Supabase...");

  // 1. Gieo dữ liệu cho bảng airports
  const { data: existingAirports, error: errAirportsCheck } = await supabase.from('airports').select('id').limit(1);
  if (!errAirportsCheck && (!existingAirports || existingAirports.length === 0)) {
    console.log("🌱 Bảng [airports] trống. Đang thêm các sân bay mẫu...");
    const sampleAirports = [
      {
        id: 1,
        airport_name: "Sân bay Quốc tế Tân Sơn Nhất",
        city: "Thành phố Hồ Chí Minh",
        iata: "SGN",
        country: "Việt Nam",
        continent: "Châu Á",
        tags: ["Chính", "Bận rộn", "Phía Nam"]
      },
      {
        id: 2,
        airport_name: "Sân bay Quốc tế Nội Bài",
        city: "Hà Nội",
        iata: "HAN",
        country: "Việt Nam",
        continent: "Châu Á",
        tags: ["Chính", "Thủ đô", "Phía Bắc"]
      },
      {
        id: 3,
        airport_name: "Sân bay Quốc tế Đà Nẵng",
        city: "Đà Nẵng",
        iata: "DAD",
        country: "Việt Nam",
        continent: "Châu Á",
        tags: ["Miền Trung", "Du lịch"]
      },
      {
        id: 4,
        airport_name: "Sân bay Quốc tế Cam Ranh",
        city: "Nha Trang",
        iata: "CXR",
        country: "Việt Nam",
        continent: "Châu Á",
        tags: ["Du lịch", "Khánh Hòa"]
      },
      {
        id: 5,
        airport_name: "Sân bay Quốc tế Phú Quốc",
        city: "Phú Quốc",
        iata: "PQC",
        country: "Việt Nam",
        continent: "Châu Á",
        tags: ["Đảo", "Du lịch"]
      }
    ];

    const { error: insertErr } = await supabase.from('airports').insert(sampleAirports);
    if (insertErr) {
      console.error("❌ Thất bại khi thêm sân bay mẫu:", insertErr.message);
    } else {
      console.log("✅ Thêm sân bay mẫu THÀNH CÔNG!");
    }
  } else {
    console.log("✨ Bảng [airports] đã có dữ liệu hoặc lỗi kiểm tra. Bỏ qua.");
  }

  // 2. Gieo dữ liệu cho bảng system_balance_thresholds
  const { data: existingThresholds, error: errThresholdsCheck } = await supabase.from('system_balance_thresholds').select('id').limit(1);
  if (!errThresholdsCheck && (!existingThresholds || existingThresholds.length === 0)) {
    console.log("🌱 Bảng [system_balance_thresholds] trống. Đang thêm các ngưỡng cân bằng mẫu...");
    const sampleThresholds = [
      {
        id: 101,
        name: "Hạn mức tối thiểu Đại lý cấp 1",
        threshold_value: 100000000, // 100M VND
        if_greater_value: 200000,   // Thưởng 200k
        if_less_value: 50000        // Phạt 50k
      },
      {
        id: 102,
        name: "Hạn mức tối thiểu Đại lý cấp 2",
        threshold_value: 50000000,  // 50M VND
        if_greater_value: 100000,
        if_less_value: 30000
      },
      {
        id: 103,
        name: "Hạn mức ký quỹ VIP Account",
        threshold_value: 500000000, // 500M VND
        if_greater_value: 1500000,
        if_less_value: 500000
      }
    ];

    const { error: insertErr } = await supabase.from('system_balance_thresholds').insert(sampleThresholds);
    if (insertErr) {
      console.error("❌ Thất bại khi thêm ngưỡng cân bằng mẫu:", insertErr.message);
    } else {
      console.log("✅ Thêm ngưỡng cân bằng mẫu THÀNH CÔNG!");
    }
  } else {
    console.log("✨ Bảng [system_balance_thresholds] đã có dữ liệu hoặc lỗi kiểm tra. Bỏ qua.");
  }

  // 3. Gieo dữ liệu cho bảng campaign
  const { data: existingCampaigns, error: errCampaignsCheck } = await supabase.from('campaign').select('id').limit(1);
  if (!errCampaignsCheck && (!existingCampaigns || existingCampaigns.length === 0)) {
    console.log("🌱 Bảng [campaign] trống. Đang thêm các chương trình mẫu...");
    const sampleCampaigns = [
      {
        id: 201,
        name: "Chương trình Hè Rực Rỡ 2026",
        carrier: "VN",
        valid_from: "2026-06-01",
        valid_to: "2026-08-31",
        departure_date_from: "2026-06-15",
        departure_date_to: "2026-09-15",
        excluded_first_tag: "VÉ_GIÁ_RẺ",
        group: 1,
        index: 10
      },
      {
        id: 202,
        name: "Chương trình Thu Quyến Rũ 2026",
        carrier: "QH",
        valid_from: "2026-09-01",
        valid_to: "2026-11-30",
        departure_date_from: "2026-09-10",
        departure_date_to: "2026-12-15",
        excluded_first_tag: "NO_DISCOUNT",
        group: 1,
        index: 20
      }
    ];

    const { error: insertErr } = await supabase.from('campaign').insert(sampleCampaigns);
    if (insertErr) {
      console.error("❌ Thất bại khi thêm chương trình mẫu:", insertErr.message);
    } else {
      console.log("✅ Thêm chương trình mẫu THÀNH CÔNG!");

      // 4. Gieo dữ liệu cho bảng campaign_details và campaign_blackout_periods sau khi đã có chương trình
      console.log("🌱 Đang thêm chi tiết chương trình và thời gian loại trừ...");
      
      const sampleDetails = [
        {
          id: 301,
          campaign_id: 201,
          booking_class: ["A", "G", "T"],
          discount_base: "FARE",
          discount_percentage: 15,
          amount: 150000,
          groups_tag: ["Học_Sinh", "Sinh_Viên"]
        },
        {
          id: 302,
          campaign_id: 201,
          booking_class: ["J", "C"],
          discount_base: "NET",
          discount_percentage: 10,
          amount: 500000,
          groups_tag: ["Thành_Viên_Vàng"]
        },
        {
          id: 303,
          campaign_id: 202,
          booking_class: ["Y", "B"],
          discount_base: "FARE",
          discount_percentage: 12,
          amount: 200000,
          groups_tag: ["Gia_Đình"]
        }
      ];

      const sampleBlackouts = [
        {
          id: 401,
          campaign_id: 201,
          start_date: "2026-08-30",
          end_date: "2026-09-03",
          type: "FLY" // Quốc Khánh
        },
        {
          id: 402,
          campaign_id: 202,
          start_date: "2026-10-20",
          end_date: "2026-10-25",
          type: "BOOKING"
        }
      ];

      const { error: detailsErr } = await supabase.from('campaign_details').insert(sampleDetails);
      if (detailsErr) console.error("❌ Lỗi thêm chi tiết mẫu:", detailsErr.message);
      else console.log("✅ Thêm chi tiết THÀNH CÔNG!");

      const { error: blackoutErr } = await supabase.from('campaign_blackout_periods').insert(sampleBlackouts);
      if (blackoutErr) console.error("❌ Lỗi thêm thời gian loại trừ mẫu:", blackoutErr.message);
      else console.log("✅ Thêm thời gian loại trừ mẫu THÀNH CÔNG!");
    }
  } else {
    console.log("✨ Bảng [campaign] đã có dữ liệu hoặc lỗi kiểm tra. Bỏ qua.");
  }

  console.log("🎉 Hoàn tất quá trình gieo dữ liệu mẫu!");
}

seed();

