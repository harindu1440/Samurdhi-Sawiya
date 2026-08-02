const pool = require('./config/db'); const startDate='2026-08-01'; const endDate='2026-08-03'; pool.execute(`
      SELECT
        wa.Application_ID    AS application_id,
        u.Username           AS applicant_name,
        a.User_ID            AS applicant_id,
        wa.Date_Submitted    AS application_date,
        wa.Status            AS application_status,
        wa.Monthly_Income    AS monthly_income,
        a.Address            AS applicant_address,
        sp.Payment_ID        AS payment_id,
        sp.Payment_Date      AS payment_date,
        sp.Amount            AS payment_amount,
        sp.Status            AS payment_status,
        gn.User_ID           AS gn_id,
        gnUser.Username      AS gn_name,
        gn.Division          AS division
      FROM \`WELFARE_APPLICATION\` wa
      JOIN \`APPLICANT\` a ON a.User_ID = wa.Applicant_ID
      JOIN \`USERS\` u ON u.User_ID = a.User_ID
      LEFT JOIN \`SAMURDHI_PAYMENT\` sp ON sp.Applicant_ID = a.User_ID
      LEFT JOIN \`MINISTER_APPROVAL\` ma ON ma.Request_ID = sp.Request_ID
      LEFT JOIN \`GRAMA_NILADHARI\` gn  ON gn.User_ID = ma.GN_ID
      LEFT JOIN \`USERS\` gnUser ON gnUser.User_ID = gn.User_ID
      WHERE wa.Status = 'Minister_Approved'
        AND DATE(wa.Date_Submitted) BETWEEN ? AND ?
      ORDER BY wa.Date_Submitted DESC`, [startDate, endDate]).then(([r]) => console.log(r)).catch(console.error).finally(()=>process.exit(0));
