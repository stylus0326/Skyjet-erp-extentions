const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';

async function testSaveAndDoubleCheck() {
  const pnr = "TEST" + Math.floor(100000 + Math.random() * 900000);
  const ticketNumber = "738" + Math.floor(1000000000 + Math.random() * 9000000000);
  
  console.log(`🚀 [Test] Khởi tạo dữ liệu mẫu với PNR: ${pnr}, Số vé: ${ticketNumber}`);

  const payload = [
    {
      ticket_number: ticketNumber,
      pnr_code: pnr,
      json_data: [
        {
          marketingAirlineCode: "VN",
          flightNumber: "219",
          departureLocationCode: "HAN",
          arrivalLocationCode: "SGN",
          departureDateTime: new Date().toISOString()
        }
      ],
      carrier: "VN",
      ticket_class: "B",
      fare: 3741000,
      channel: "PARTNER",
      AGCODE: "AG001",
      DATECOM: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    }
  ];

  try {
    // 1. Lưu dữ liệu lên Supabase (vna_ticket_cache)
    console.log(`📤 [Test] Gửi dữ liệu lên Supabase (vna_ticket_cache)...`);
    const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/vna_ticket_cache`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(payload)
    });

    if (saveRes.ok) {
      console.log(`✅ [Test] Lưu dữ liệu thành công!`);
    } else {
      console.error(`❌ [Test] Lưu dữ liệu thất bại:`, await saveRes.text());
      return;
    }

    // 2. Double Check: Truy vấn ngược lại để xác thực dữ liệu đã lưu
    console.log(`🔍 [Test] Bắt đầu Double Check: Truy vấn lại dữ liệu từ PNR: ${pnr}...`);
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/vna_ticket_cache?pnr_code=eq.${pnr}&select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (checkRes.ok) {
      const data = await checkRes.json();
      console.log(`📋 [Test] Kết quả truy vấn trả về:`, data);
      
      if (data && data.length > 0 && data[0].ticket_number === ticketNumber) {
        console.log(`🎉 [XÁC THỰC THÀNH CÔNG] Dữ liệu lưu khớp 100% với dữ liệu kiểm tra!`);
      } else {
        console.error(`❌ [XÁC THỰC THẤT BẠI] Dữ liệu không khớp hoặc không tìm thấy!`);
      }
    } else {
      console.error(`❌ [Test] Lỗi khi truy vấn kiểm tra dữ liệu:`, await checkRes.text());
    }

  } catch (err) {
    console.error(`❌ [Test] Lỗi ngoại lệ trong quá trình chạy thử nghiệm:`, err);
  }
}

testSaveAndDoubleCheck();
