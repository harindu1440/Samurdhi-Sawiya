-- =============================================================================
-- SamurdhiSaviya — Final Production Schema
-- Engine  : InnoDB
-- Charset : utf8mb4 / utf8mb4_unicode_ci
-- MySQL   : 8.x compatible
--
-- IMPORTANT — Default Minister password:
--   This script inserts a hashed password for 'Minister@1234'.
--   Generate your own hash before deploying to production:
--     node -e "require('bcryptjs').hash('YourPassword',12).then(console.log)"
--   Then replace the Password value in the INSERT at the bottom.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- DATABASE
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `SamurdhiSaviya`
  CHARACTER SET  utf8mb4
  COLLATE        utf8mb4_unicode_ci;

USE `SamurdhiSaviya`;

-- =============================================================================
-- 1. DROP TABLES (in reverse FK dependency order for clean re-runs)
-- =============================================================================

DROP TABLE IF EXISTS `SAMURDHI_PAYMENT`;
DROP TABLE IF EXISTS `MINISTER_APPROVAL`;
DROP TABLE IF EXISTS `HOME_VISIT`;
DROP TABLE IF EXISTS `WELFARE_APPLICATION`;
DROP TABLE IF EXISTS `APPLICANT`;
DROP TABLE IF EXISTS `SAMURDHI_OFFICER`;
DROP TABLE IF EXISTS `GRAMA_NILADHARI`;
DROP TABLE IF EXISTS `MINISTER`;
DROP TABLE IF EXISTS `USERS`;

-- =============================================================================
-- 2. SUPERCLASS — USERS
--    One authentication row per system user regardless of role.
--    No separate Admin — Minister is the top-level administrator.
-- =============================================================================

CREATE TABLE `USERS` (
  `User_ID`   INT           NOT NULL AUTO_INCREMENT
              COMMENT 'Surrogate PK shared across all role subclass tables.',
  `Username`  VARCHAR(100)  NOT NULL
              COMMENT 'Unique login name used for authentication.',
  `Password`  VARCHAR(255)  NOT NULL
              COMMENT 'bcrypt hash (cost >= 12). Never store plaintext.',
  `Role`      ENUM(
                'Applicant',
                'Samurdhi_Officer',
                'Grama_Niladhari',
                'Minister'
              )             NOT NULL
              COMMENT 'Discriminator — identifies the active subclass table.',
  `Phone_Num` VARCHAR(20)   DEFAULT NULL
              COMMENT 'Optional contact number.',
  PRIMARY KEY (`User_ID`),
  UNIQUE KEY  `uq_users_username` (`Username`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Superclass: one authentication record per system user.';

-- =============================================================================
-- 3. SUBCLASS — APPLICANT   (IS-A USERS)
-- =============================================================================

CREATE TABLE `APPLICANT` (
  `User_ID`   INT           NOT NULL
              COMMENT 'PK = FK → USERS(User_ID). Shared surrogate key.',
  `Full_Name` VARCHAR(255)  NOT NULL
              COMMENT 'Legal full name of the applicant.',
  `NIC`       VARCHAR(20)   NOT NULL
              COMMENT 'National Identity Card number — must be unique.',
  `Address`   TEXT          NOT NULL
              COMMENT 'Permanent residential address.',
  `DOB`       DATE          DEFAULT NULL
              COMMENT 'Date of birth.',
  `Gender`    ENUM('Male', 'Female')
              DEFAULT NULL
              COMMENT 'Gender as declared during registration.',
  PRIMARY KEY (`User_ID`),
  UNIQUE KEY  `uq_applicant_nic` (`NIC`),
  CONSTRAINT  `fk_applicant_user`
    FOREIGN KEY (`User_ID`)
    REFERENCES  `USERS` (`User_ID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Subclass: welfare benefit applicant.';

-- =============================================================================
-- 4. SUBCLASS — SAMURDHI_OFFICER   (IS-A USERS)
-- =============================================================================

CREATE TABLE `SAMURDHI_OFFICER` (
  `User_ID`   INT  NOT NULL
              COMMENT 'PK = FK → USERS(User_ID).',
  PRIMARY KEY (`User_ID`),
  CONSTRAINT  `fk_officer_user`
    FOREIGN KEY (`User_ID`)
    REFERENCES  `USERS` (`User_ID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Subclass: Samurdhi Officer who conducts home visits.';

-- =============================================================================
-- 5. SUBCLASS — GRAMA_NILADHARI   (IS-A USERS)
-- =============================================================================

CREATE TABLE `GRAMA_NILADHARI` (
  `User_ID`   INT  NOT NULL
              COMMENT 'PK = FK → USERS(User_ID).',
  PRIMARY KEY (`User_ID`),
  CONSTRAINT  `fk_gn_user`
    FOREIGN KEY (`User_ID`)
    REFERENCES  `USERS` (`User_ID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Subclass: Grama Niladhari who reviews and forwards applications.';

-- =============================================================================
-- 6. SUBCLASS — MINISTER   (IS-A USERS)
--    Acts as top-level system administrator.
-- =============================================================================

CREATE TABLE `MINISTER` (
  `User_ID`   INT  NOT NULL
              COMMENT 'PK = FK → USERS(User_ID).',
  PRIMARY KEY (`User_ID`),
  CONSTRAINT  `fk_minister_user`
    FOREIGN KEY (`User_ID`)
    REFERENCES  `USERS` (`User_ID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Subclass: Minister — top-level administrator and final approver.';

-- =============================================================================
-- 7. WELFARE_APPLICATION
--    Submitted by an APPLICANT. Tracks the full approval lifecycle.
-- =============================================================================

CREATE TABLE `WELFARE_APPLICATION` (
  `Application_ID`  INT           NOT NULL AUTO_INCREMENT,
  `Applicant_ID`    INT           NOT NULL
                    COMMENT 'FK → APPLICANT(User_ID). Who submitted this application.',
  `Monthly_Income`  DECIMAL(10,2) NOT NULL DEFAULT 0.00
                    COMMENT 'Declared monthly household income in LKR.',
  `Dependents`      INT           NOT NULL DEFAULT 0
                    COMMENT 'Number of household dependents.',
  `Reason`          TEXT          NOT NULL
                    COMMENT 'Applicant-stated reason for requesting benefit.',
  `House_Photo`     VARCHAR(255)  DEFAULT NULL
                    COMMENT 'Stored filename of the uploaded house photograph.',
  `Status`          ENUM(
                      'Pending',
                      'GN_Approved',
                      'Officer_Approved',
                      'Minister_Approved',
                      'Rejected'
                    )             NOT NULL DEFAULT 'Pending'
                    COMMENT 'Current processing stage of the application.',
  `Date_Submitted`  DATE          NOT NULL DEFAULT (CURDATE())
                    COMMENT 'Date the application was submitted.',
  PRIMARY KEY (`Application_ID`),
  KEY `idx_wa_applicant` (`Applicant_ID`),
  KEY `idx_wa_status`    (`Status`),
  CONSTRAINT `fk_wa_applicant`
    FOREIGN KEY (`Applicant_ID`)
    REFERENCES  `APPLICANT` (`User_ID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `chk_wa_income`
    CHECK (`Monthly_Income` >= 0),
  CONSTRAINT `chk_wa_dependents`
    CHECK (`Dependents` >= 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Welfare benefit applications and their approval lifecycle.';

-- =============================================================================
-- 8. HOME_VISIT
--    Recorded by a SAMURDHI_OFFICER for a specific WELFARE_APPLICATION.
--    One application can have at most one home visit (enforced by UNIQUE key).
-- =============================================================================

CREATE TABLE `HOME_VISIT` (
  `Visit_ID`       INT          NOT NULL AUTO_INCREMENT,
  `Application_ID` INT          NOT NULL
                   COMMENT 'FK → WELFARE_APPLICATION. The application being evaluated.',
  `Officer_ID`     INT          NOT NULL
                   COMMENT 'FK → SAMURDHI_OFFICER(User_ID). Officer who conducted the visit.',
  `Remarks`        TEXT         DEFAULT NULL
                   COMMENT 'Field observations recorded by the officer.',
  `Recommendation` VARCHAR(100) NOT NULL
                   COMMENT 'e.g. Highly Recommended / Recommended / Not Recommended.',
  `Date_Visited`   DATE         NOT NULL
                   COMMENT 'Date the home visit was conducted.',
  PRIMARY KEY (`Visit_ID`),
  UNIQUE KEY  `uq_hv_application` (`Application_ID`),
  KEY `idx_hv_officer` (`Officer_ID`),
  CONSTRAINT `fk_hv_application`
    FOREIGN KEY (`Application_ID`)
    REFERENCES  `WELFARE_APPLICATION` (`Application_ID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_hv_officer`
    FOREIGN KEY (`Officer_ID`)
    REFERENCES  `SAMURDHI_OFFICER` (`User_ID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Home visit inspection records conducted by Samurdhi Officers.';

-- =============================================================================
-- 9. MINISTER_APPROVAL
--    Created by a GRAMA_NILADHARI forwarding a WELFARE_APPLICATION to the
--    MINISTER for final review. One approval record per application (UNIQUE).
-- =============================================================================

CREATE TABLE `MINISTER_APPROVAL` (
  `Request_ID`     INT          NOT NULL AUTO_INCREMENT,
  `Application_ID` INT          NOT NULL
                   COMMENT 'FK → WELFARE_APPLICATION (1-to-1 enforced via UNIQUE).',
  `GN_ID`          INT          NOT NULL
                   COMMENT 'FK → GRAMA_NILADHARI(User_ID). GN who forwarded the request.',
  `Minister_ID`    INT          DEFAULT NULL
                   COMMENT 'FK → MINISTER(User_ID). Assigned after initial forwarding.',
  `Final_Status`   VARCHAR(50)  NOT NULL DEFAULT 'Pending'
                   COMMENT 'Approval outcome: Pending / Approved / Rejected.',
  `Date_Reviewed`  DATE         DEFAULT NULL
                   COMMENT 'Date the Minister reviewed and updated the status.',
  PRIMARY KEY (`Request_ID`),
  UNIQUE KEY  `uq_ma_application` (`Application_ID`),
  KEY `idx_ma_gn`       (`GN_ID`),
  KEY `idx_ma_minister` (`Minister_ID`),
  CONSTRAINT `fk_ma_application`
    FOREIGN KEY (`Application_ID`)
    REFERENCES  `WELFARE_APPLICATION` (`Application_ID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ma_gn`
    FOREIGN KEY (`GN_ID`)
    REFERENCES  `GRAMA_NILADHARI` (`User_ID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ma_minister`
    FOREIGN KEY (`Minister_ID`)
    REFERENCES  `MINISTER` (`User_ID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Minister approval requests forwarded by the Grama Niladhari.';

-- =============================================================================
-- 10. SAMURDHI_PAYMENT
--     Generated after MINISTER_APPROVAL is finalised. Financial records are
--     protected with ON DELETE RESTRICT — they must never be auto-deleted.
-- =============================================================================

CREATE TABLE `SAMURDHI_PAYMENT` (
  `Payment_ID`   INT            NOT NULL AUTO_INCREMENT,
  `Request_ID`   INT            NOT NULL
                 COMMENT 'FK → MINISTER_APPROVAL. The approval that triggered this payment.',
  `Applicant_ID` INT            NOT NULL
                 COMMENT 'FK → APPLICANT(User_ID). Recipient of the payment.',
  `Amount`       DECIMAL(10,2)  NOT NULL
                 COMMENT 'Disbursed payment amount in LKR.',
  `Status`       VARCHAR(50)    NOT NULL DEFAULT 'Pending'
                 COMMENT 'Payment status: Pending / Completed / Failed.',
  `Payment_Date` DATE           NOT NULL
                 COMMENT 'Date on which the payment was issued.',
  PRIMARY KEY (`Payment_ID`),
  KEY `idx_sp_request`   (`Request_ID`),
  KEY `idx_sp_applicant` (`Applicant_ID`),
  CONSTRAINT `fk_sp_request`
    FOREIGN KEY (`Request_ID`)
    REFERENCES  `MINISTER_APPROVAL` (`Request_ID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_sp_applicant`
    FOREIGN KEY (`Applicant_ID`)
    REFERENCES  `APPLICANT` (`User_ID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `chk_sp_amount`
    CHECK (`Amount` > 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Samurdhi payment disbursements generated after ministerial approval.';

-- Re-enable FK checks
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 11. DEFAULT MINISTER ACCOUNT
--
--     Username : minister_admin
--     Password : Minister@1234   (bcrypt cost 12)
--
--     To generate your own hash and replace the value below, run:
--       node -e "require('bcryptjs').hash('YourStrongPassword',12).then(console.log)"
-- =============================================================================

INSERT INTO `USERS` (`Username`, `Password`, `Role`, `Phone_Num`)
VALUES (
  'minister_admin',
  '$2a$12$jPBVFDZV.qzuz.sAIzA5wOcjAkHgXIWvaRBD6xE6x9BtcmwPv9wSK',
  'Minister',
  NULL
);

-- Insert matching MINISTER subclass row using the auto-generated User_ID
INSERT INTO `MINISTER` (`User_ID`)
VALUES (LAST_INSERT_ID());
