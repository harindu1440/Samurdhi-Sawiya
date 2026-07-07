-- SamurdhiSaviya core database schema
-- MySQL 8.x compatible

CREATE DATABASE IF NOT EXISTS `SamurdhiSaviya`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `SamurdhiSaviya`;

CREATE TABLE IF NOT EXISTS `Applicant` (
  `Applicant_ID` INT NOT NULL AUTO_INCREMENT COMMENT 'Unique identifier for each applicant record.',
  `Full_Name` VARCHAR(255) NOT NULL COMMENT 'Applicant full name as captured during registration.',
  `Address` TEXT NOT NULL COMMENT 'Primary residential address of the applicant.',
  `Status` ENUM('Pending', 'Accepted', 'Rejected') NOT NULL DEFAULT 'Pending' COMMENT 'Current application review status.',
  `Phone_Num` VARCHAR(15) UNIQUE COMMENT 'Applicant contact number used for communication and verification.',
  `Registered_Date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date and time when the applicant was registered.',
  `Monthly_Income` DECIMAL(10,2) COMMENT 'Declared monthly income for eligibility assessment.',
  PRIMARY KEY (`Applicant_ID`),
  CONSTRAINT `chk_applicant_monthly_income_non_negative` CHECK (`Monthly_Income` IS NULL OR `Monthly_Income` >= 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Stores applicant master records for the SamurdhiSaviya system.';

CREATE TABLE IF NOT EXISTS `Samurdhi_officer` (
  `Officer_ID` INT NOT NULL AUTO_INCREMENT COMMENT 'Unique identifier for each Samurdhi officer.',
  `Full_Name` VARCHAR(255) NOT NULL COMMENT 'Officer full name used in administrative and operational records.',
  `Area` VARCHAR(255) NOT NULL COMMENT 'Operational area or jurisdiction assigned to the officer.',
  `Phone_Num` VARCHAR(15) NOT NULL UNIQUE COMMENT 'Official officer contact number.',
  `Password_Hash` VARCHAR(255) DEFAULT NULL COMMENT 'Secure password hash used for officer authentication.',
  PRIMARY KEY (`Officer_ID`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Stores Samurdhi officer records and contact details.';

CREATE TABLE IF NOT EXISTS `Grama_Niladhari` (
  `GN_ID` INT NOT NULL AUTO_INCREMENT COMMENT 'Unique identifier for each Grama Niladhari record.',
  `GN_FullName` VARCHAR(255) NOT NULL COMMENT 'Grama Niladhari full name.',
  `Division` VARCHAR(255) NOT NULL COMMENT 'Administrative division covered by the Grama Niladhari.',
  `GN_P_Num` VARCHAR(15) NOT NULL UNIQUE COMMENT 'Contact phone number for the Grama Niladhari.',
  `Password_Hash` VARCHAR(255) DEFAULT NULL COMMENT 'Secure password hash used for GN authentication.',
  PRIMARY KEY (`GN_ID`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Stores Grama Niladhari administrative contact information.';

CREATE TABLE IF NOT EXISTS `Welfare_Application` (
  `Application_ID` INT NOT NULL AUTO_INCREMENT COMMENT 'Unique identifier for each welfare application.',
  `Date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date and time when the welfare application was created.',
  `App_Status` ENUM('Pending', 'Accepted', 'Rejected') NOT NULL DEFAULT 'Pending' COMMENT 'Current processing status of the welfare application.',
  `Officer_Approval` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Indicates whether the Samurdhi officer has approved the application.',
  `GN_Approval` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Indicates whether the Grama Niladhari has approved the application.',
  `Monthly_Income` DECIMAL(10,2) NOT NULL COMMENT 'Declared monthly household income provided by the applicant.',
  `Family_Size` INT NOT NULL COMMENT 'Number of family members in the applicant household.',
  `House_Photo_Path` VARCHAR(255) NOT NULL COMMENT 'Relative storage path for the uploaded house photograph.',
  `Applicant_ID` INT NOT NULL COMMENT 'References the applicant associated with this welfare application.',
  PRIMARY KEY (`Application_ID`),
  KEY `idx_welfare_application_applicant_id` (`Applicant_ID`),
  CONSTRAINT `fk_welfare_application_applicant`
    FOREIGN KEY (`Applicant_ID`) REFERENCES `Applicant` (`Applicant_ID`)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Stores welfare application workflow and approval details.';

CREATE TABLE IF NOT EXISTS `Home_Visit` (
  `V_ID` INT NOT NULL AUTO_INCREMENT COMMENT 'Unique identifier for each home visit record.',
  `Visit_Date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date and time when the home visit was conducted.',
  `Remarks` TEXT COMMENT 'Officer observations and notes captured during the visit.',
  `Recommendation` ENUM('Highly Recommended', 'Recommended', 'Not Recommended') NOT NULL COMMENT 'Final recommendation after the home visit assessment.',
  `Applicant_ID` INT NOT NULL COMMENT 'References the applicant evaluated during the home visit.',
  PRIMARY KEY (`V_ID`),
  KEY `idx_home_visit_applicant_id` (`Applicant_ID`),
  CONSTRAINT `fk_home_visit_applicant`
    FOREIGN KEY (`Applicant_ID`) REFERENCES `Applicant` (`Applicant_ID`)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Stores home visit inspections and recommendations for applicants.';

CREATE TABLE IF NOT EXISTS `Complains` (
  `Com_ID` INT NOT NULL AUTO_INCREMENT COMMENT 'Unique identifier for each complaint record.',
  `Reason` TEXT NOT NULL COMMENT 'Reason or description of the complaint submitted by the applicant.',
  `Date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date and time when the complaint was logged.',
  `Applicant_ID` INT NOT NULL COMMENT 'References the applicant who submitted the complaint.',
  PRIMARY KEY (`Com_ID`),
  KEY `idx_complains_applicant_id` (`Applicant_ID`),
  CONSTRAINT `fk_complains_applicant`
    FOREIGN KEY (`Applicant_ID`) REFERENCES `Applicant` (`Applicant_ID`)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Stores complaint records linked to applicants.';

CREATE TABLE IF NOT EXISTS `Samurdhi_payment` (
  `SP_ID` INT NOT NULL AUTO_INCREMENT COMMENT 'Unique identifier for each Samurdhi payment record.',
  `P_Status` VARCHAR(50) NOT NULL COMMENT 'Payment processing status for the record.',
  `Date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date and time when the payment record was created.',
  `Payment` DECIMAL(10,2) NOT NULL COMMENT 'Payment amount associated with the applicant.',
  `Applicant_ID` INT NOT NULL COMMENT 'References the applicant receiving the payment.',
  `GN_ID` INT NOT NULL COMMENT 'References the Grama Niladhari associated with the payment processing.',
  PRIMARY KEY (`SP_ID`),
  KEY `idx_samurdhi_payment_applicant_id` (`Applicant_ID`),
  KEY `idx_samurdhi_payment_gn_id` (`GN_ID`),
  CONSTRAINT `fk_samurdhi_payment_applicant`
    FOREIGN KEY (`Applicant_ID`) REFERENCES `Applicant` (`Applicant_ID`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_samurdhi_payment_grama_niladhari`
    FOREIGN KEY (`GN_ID`) REFERENCES `Grama_Niladhari` (`GN_ID`)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Stores payment transactions related to applicants and Grama Niladhari oversight.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Node.js Migration Extensions
-- Run these statements once on the Railway database after the initial schema.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Applicant password support (enables portal login)
ALTER TABLE `Applicant`
  ADD COLUMN IF NOT EXISTS `Password_Hash` VARCHAR(255) DEFAULT NULL
    COMMENT 'bcrypt password hash for applicant portal login.'
  AFTER `Monthly_Income`;

-- 2. Admin accounts table
CREATE TABLE IF NOT EXISTS `Admin` (
  `Admin_ID`      INT          NOT NULL AUTO_INCREMENT COMMENT 'Unique admin identifier.',
  `Full_Name`     VARCHAR(255) NOT NULL                COMMENT 'Administrator full name.',
  `Password_Hash` VARCHAR(255) NOT NULL                COMMENT 'bcrypt password hash (cost 12).',
  `Created_At`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Admin_ID`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='System administrator accounts for SamurdhiSaviya.';

-- 3. Seed admin account
--    Default credentials: Admin_ID=1 / Password=Admin@1234
--    IMPORTANT: Generate your own bcrypt hash before deploying:
--      node -e "require('bcryptjs').hash('Admin@1234',12).then(console.log)"
--    Then replace the placeholder hash below with the real one.
INSERT IGNORE INTO `Admin` (`Admin_ID`, `Full_Name`, `Password_Hash`) VALUES
  (1, 'System Administrator', '$2a$12$REPLACE_WITH_YOUR_OWN_BCRYPT_HASH');

