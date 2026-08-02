const pool = require('./config/db');

async function run() {
  try {
    await pool.execute("ALTER TABLE WELFARE_APPLICATION MODIFY COLUMN Status ENUM('Pending','GN_Approved','Update_Required','Officer_Approved','Minister_Approved','Rejected') NOT NULL DEFAULT 'Pending'");
    await pool.execute("ALTER TABLE WELFARE_APPLICATION ADD COLUMN Update_Reason TEXT NULL AFTER Status");
    console.log('DB updated');
    process.exit(0);
  } catch(e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Update_Reason column already exists');
      process.exit(0);
    }
    console.error(e);
    process.exit(1);
  }
}
run();
