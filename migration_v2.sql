-- =============================================================================
-- SamurdhiSaviya — Migration v2
-- Purpose : Add missing columns required by the combined Registration +
--           Welfare Application submission flow.
-- Safe    : Uses IF NOT EXISTS — can be re-run without errors.
-- Run on  : s98_SamrudhiSawiya (Pterodactyl MySQL)
-- =============================================================================

-- ── 1. APPLICANT — add identity columns missing from ER schema ────────────────
ALTER TABLE `APPLICANT`
  ADD COLUMN IF NOT EXISTS `NIC`
    VARCHAR(20)  DEFAULT NULL
    COMMENT 'National Identity Card number of the applicant.'
    AFTER `Full_Name`,

  ADD COLUMN IF NOT EXISTS `DOB`
    DATE         DEFAULT NULL
    COMMENT 'Date of birth.'
    AFTER `NIC`,

  ADD COLUMN IF NOT EXISTS `Gender`
    ENUM('Male','Female','Other') DEFAULT NULL
    COMMENT 'Gender as declared during registration.'
    AFTER `DOB`,

  ADD COLUMN IF NOT EXISTS `Monthly_Income`
    DECIMAL(10,2) DEFAULT NULL
    COMMENT 'Declared monthly household income (LKR, non-negative).'
    AFTER `Gender`;

-- Guard: ensure income is never negative if set
-- (MySQL 8+ supports multi-column IF NOT EXISTS for constraints via a workaround;
--  we simply add a CHECK if the table allows it)
-- ALTER TABLE `APPLICANT`
--   ADD CONSTRAINT `chk_applicant_income`
--     CHECK (`Monthly_Income` IS NULL OR `Monthly_Income` >= 0);
-- ^ Uncomment only if constraint doesn't already exist.

-- ── 2. WELFARE_APPLICATION — add application-specific snapshot columns ─────────
ALTER TABLE `WELFARE_APPLICATION`
  ADD COLUMN IF NOT EXISTS `Monthly_Income`
    DECIMAL(10,2) DEFAULT NULL
    COMMENT 'Monthly income snapshot at time of application submission.'
    AFTER `Date`,

  ADD COLUMN IF NOT EXISTS `Dependents`
    TINYINT UNSIGNED DEFAULT NULL
    COMMENT 'Number of dependents declared at time of application.'
    AFTER `Monthly_Income`,

  ADD COLUMN IF NOT EXISTS `Reason`
    TEXT          DEFAULT NULL
    COMMENT 'Applicant-stated reason for requesting Samurdhi benefit.'
    AFTER `Dependents`;

-- =============================================================================
-- VERIFICATION
-- Run these SELECTs after migration to confirm columns exist.
-- =============================================================================
/*
DESCRIBE `APPLICANT`;
DESCRIBE `WELFARE_APPLICATION`;
*/
