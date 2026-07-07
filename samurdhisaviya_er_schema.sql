-- =============================================================================
-- SamurdhiSaviya — ER Diagram to Production MySQL Schema
-- Engine  : InnoDB
-- Charset : utf8mb4 / utf8mb4_unicode_ci
-- MySQL   : 8.x compatible
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;   -- Defer FK checks during creation

-- =============================================================================
-- DATABASE
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `SamurdhiSaviya_v2`
  CHARACTER SET  utf8mb4
  COLLATE        utf8mb4_unicode_ci;

USE `SamurdhiSaviya_v2`;

-- =============================================================================
-- 1. SUPERCLASS — USERS
--    All roles share one authentication row here.
--    Subclass tables carry the same PK as a FK back to this table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `USERS` (
  `User_ID`   INT           NOT NULL AUTO_INCREMENT
              COMMENT 'Surrogate PK shared across all role subclass tables.',
  `Username`  VARCHAR(100)  NOT NULL
              COMMENT 'Unique login name used for authentication.',
  `Password`  VARCHAR(255)  NOT NULL
              COMMENT 'bcrypt hash (cost ≥ 12). Never store plaintext.',
  `Role`      ENUM(
                'Admin',
                'Minister',
                'Grama_Niladhari',
                'Samurdhi_Officer',
                'Applicant'
              )             NOT NULL
              COMMENT 'Discriminator column — identifies the active subclass.',
  `Phone_Num` VARCHAR(20)   DEFAULT NULL
              COMMENT 'Optional contact number.',
  PRIMARY KEY (`User_ID`),
  UNIQUE KEY  `uq_users_username` (`Username`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Superclass: one authentication record per system user regardless of role.';

-- =============================================================================
-- 2. SUBCLASS — ADMIN   (IS-A USERS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `ADMIN` (
  `Admin_ID`  INT  NOT NULL
              COMMENT 'PK = FK → USERS(User_ID). Shares the same surrogate key.',
  PRIMARY KEY (`Admin_ID`),
  CONSTRAINT `fk_admin_user`
    FOREIGN KEY (`Admin_ID`)
    REFERENCES  `USERS` (`User_ID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Subclass: system administrator.';

-- =============================================================================
-- 3. SUBCLASS — MINISTER   (IS-A USERS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `MINISTER` (
  `Minister_ID`  INT  NOT NULL
                 COMMENT 'PK = FK → USERS(User_ID).',
  PRIMARY KEY (`Minister_ID`),
  CONSTRAINT `fk_minister_user`
    FOREIGN KEY (`Minister_ID`)
    REFERENCES  `USERS` (`User_ID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Subclass: government minister who reviews welfare approvals.';

-- =============================================================================
-- 4. SUBCLASS — GRAMA_NILADHARI   (IS-A USERS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `GRAMA_NILADHARI` (
  `GN_ID`     INT           NOT NULL
              COMMENT 'PK = FK → USERS(User_ID).',
  `Division`  VARCHAR(255)  DEFAULT NULL
              COMMENT 'Administrative division managed by this officer.',
  PRIMARY KEY (`GN_ID`),
  CONSTRAINT `fk_gn_user`
    FOREIGN KEY (`GN_ID`)
    REFERENCES  `USERS` (`User_ID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Subclass: Grama Niladhari (village-level officer) who forwards applications.';

-- =============================================================================
-- 5. SUBCLASS — SAMURDHI_OFFICER   (IS-A USERS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `SAMURDHI_OFFICER` (
  `Officer_ID`  INT           NOT NULL
                COMMENT 'PK = FK → USERS(User_ID).',
  `Area`        VARCHAR(255)  DEFAULT NULL
                COMMENT 'Operational area assigned to this officer.',
  PRIMARY KEY (`Officer_ID`),
  CONSTRAINT `fk_officer_user`
    FOREIGN KEY (`Officer_ID`)
    REFERENCES  `USERS` (`User_ID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Subclass: Samurdhi Officer who conducts home visits.';

-- =============================================================================
-- 6. SUBCLASS — APPLICANT   (IS-A USERS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `APPLICANT` (
  `Applicant_ID`   INT           NOT NULL
                   COMMENT 'PK = FK → USERS(User_ID).',
  `Full_Name`      VARCHAR(255)  DEFAULT NULL
                   COMMENT 'Legal full name of the applicant.',
  `Address`        TEXT          DEFAULT NULL
                   COMMENT 'Residential address.',
  `Monthly_Income` DECIMAL(10,2) DEFAULT NULL
                   COMMENT 'Declared monthly household income (non-negative).',
  PRIMARY KEY (`Applicant_ID`),
  CONSTRAINT `fk_applicant_user`
    FOREIGN KEY (`Applicant_ID`)
    REFERENCES  `USERS` (`User_ID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `chk_applicant_income`
    CHECK (`Monthly_Income` IS NULL OR `Monthly_Income` >= 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Subclass: welfare benefit applicant.';

-- =============================================================================
-- 7. HOME_VISIT
--    Relationship: conducted by 1 SAMURDHI_OFFICER (1-to-Many from Officer).
--    One officer can conduct many visits; each visit belongs to one officer.
--    ON DELETE RESTRICT — do not delete an officer who has visit records.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `HOME_VISIT` (
  `Visit_ID`       INT          NOT NULL AUTO_INCREMENT,
  `Remarks`        TEXT         DEFAULT NULL
                   COMMENT 'Field observations recorded by the officer.',
  `Recommendation` VARCHAR(100) NOT NULL
                   COMMENT 'e.g. Highly Recommended / Recommended / Not Recommended.',
  `Date`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                   COMMENT 'Date and time when the visit was conducted.',
  `Officer_ID`     INT          NOT NULL
                   COMMENT 'FK → SAMURDHI_OFFICER. Officer who conducted this visit.',
  PRIMARY KEY (`Visit_ID`),
  KEY `idx_home_visit_officer` (`Officer_ID`),
  CONSTRAINT `fk_visit_officer`
    FOREIGN KEY (`Officer_ID`)
    REFERENCES  `SAMURDHI_OFFICER` (`Officer_ID`)
    ON DELETE RESTRICT   -- Protect historical visit records
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Home visit inspection records conducted by Samurdhi Officers.';

-- =============================================================================
-- 8. WELFARE_APPLICATION
--    Relationship 1: submitted by 1 APPLICANT       (1-to-Many from Applicant).
--    Relationship 2: checked by  1 HOME_VISIT       (1-to-1 — UNIQUE).
--    ON DELETE RESTRICT on Visit_ID: a visit linked to an application is locked.
--    ON DELETE CASCADE  on Applicant_ID: deleting an applicant removes their apps.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `WELFARE_APPLICATION` (
  `Application_ID`  INT          NOT NULL AUTO_INCREMENT,
  `Status`          ENUM(
                      'Pending',
                      'Under Review',
                      'Forwarded',
                      'Accepted',
                      'Rejected'
                    )            NOT NULL DEFAULT 'Pending'
                    COMMENT 'Current processing stage of the application.',
  `Date`            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                    COMMENT 'Submission timestamp.',
  `Applicant_ID`    INT          NOT NULL
                    COMMENT 'FK → APPLICANT. Who submitted this application.',
  `Visit_ID`        INT          DEFAULT NULL
                    COMMENT 'FK → HOME_VISIT (1-to-1). Linked visit record.',
  PRIMARY KEY (`Application_ID`),
  UNIQUE KEY  `uq_application_visit` (`Visit_ID`),          -- enforces 1-to-1
  KEY `idx_application_applicant` (`Applicant_ID`),
  CONSTRAINT `fk_application_applicant`
    FOREIGN KEY (`Applicant_ID`)
    REFERENCES  `APPLICANT` (`Applicant_ID`)
    ON DELETE CASCADE    -- Remove applications when applicant is deleted
    ON UPDATE CASCADE,
  CONSTRAINT `fk_application_visit`
    FOREIGN KEY (`Visit_ID`)
    REFERENCES  `HOME_VISIT` (`Visit_ID`)
    ON DELETE RESTRICT   -- Cannot delete a visit already linked to an application
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Welfare benefit applications — links applicant to their home visit.';

-- =============================================================================
-- 9. MINISTER_APPROVAL
--    Relationship 1: forwarded by 1 GRAMA_NILADHARI for 1 WELFARE_APPLICATION
--                    (UNIQUE on Application_ID enforces the 1-to-1 with application).
--    Relationship 2: reviewed   by 1 MINISTER (1-to-Many from Minister).
--    ON DELETE RESTRICT on all FKs — approval history must be preserved.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `MINISTER_APPROVAL` (
  `Request_ID`      INT          NOT NULL AUTO_INCREMENT,
  `Status`          VARCHAR(50)  NOT NULL DEFAULT 'Pending'
                    COMMENT 'Approval status: Pending / Approved / Rejected.',
  `Date`            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                    COMMENT 'Date the request was forwarded.',
  `GN_ID`           INT          NOT NULL
                    COMMENT 'FK → GRAMA_NILADHARI. GN who forwarded this request.',
  `Application_ID`  INT          NOT NULL
                    COMMENT 'FK → WELFARE_APPLICATION (1-to-1). The specific application.',
  `Minister_ID`     INT          DEFAULT NULL
                    COMMENT 'FK → MINISTER. Minister assigned to review.',
  PRIMARY KEY (`Request_ID`),
  UNIQUE KEY  `uq_approval_application` (`Application_ID`),  -- 1-to-1 with application
  KEY `idx_approval_gn`       (`GN_ID`),
  KEY `idx_approval_minister` (`Minister_ID`),
  CONSTRAINT `fk_approval_gn`
    FOREIGN KEY (`GN_ID`)
    REFERENCES  `GRAMA_NILADHARI` (`GN_ID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_approval_application`
    FOREIGN KEY (`Application_ID`)
    REFERENCES  `WELFARE_APPLICATION` (`Application_ID`)
    ON DELETE RESTRICT   -- Approval records outlive the review process
    ON UPDATE CASCADE,
  CONSTRAINT `fk_approval_minister`
    FOREIGN KEY (`Minister_ID`)
    REFERENCES  `MINISTER` (`Minister_ID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Minister approval requests forwarded by GN for each welfare application.';

-- =============================================================================
-- 10. SAMURDHI_PAYMENT
--     Relationship 1: generated from 1 MINISTER_APPROVAL (1-to-1 — UNIQUE).
--     Relationship 2: received   by  1 APPLICANT          (1-to-Many from Applicant).
--     ON DELETE RESTRICT — payment records are financial and must never cascade.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `SAMURDHI_PAYMENT` (
  `Payment_ID`   INT            NOT NULL AUTO_INCREMENT,
  `Amount`       DECIMAL(12,2)  NOT NULL
                 COMMENT 'Disbursed payment amount in LKR.',
  `Date`         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                 COMMENT 'Date on which the payment was issued.',
  `Status`       VARCHAR(50)    NOT NULL DEFAULT 'Pending'
                 COMMENT 'Payment status: Pending / Completed / Failed.',
  `Request_ID`   INT            NOT NULL
                 COMMENT 'FK → MINISTER_APPROVAL (1-to-1). The approval that triggered this payment.',
  `Applicant_ID` INT            NOT NULL
                 COMMENT 'FK → APPLICANT. Recipient of the payment.',
  PRIMARY KEY (`Payment_ID`),
  UNIQUE KEY  `uq_payment_request` (`Request_ID`),          -- 1-to-1 with approval
  KEY `idx_payment_applicant` (`Applicant_ID`),
  CONSTRAINT `fk_payment_request`
    FOREIGN KEY (`Request_ID`)
    REFERENCES  `MINISTER_APPROVAL` (`Request_ID`)
    ON DELETE RESTRICT   -- Financial record — never auto-delete
    ON UPDATE CASCADE,
  CONSTRAINT `fk_payment_applicant`
    FOREIGN KEY (`Applicant_ID`)
    REFERENCES  `APPLICANT` (`Applicant_ID`)
    ON DELETE RESTRICT   -- Financial record — never auto-delete
    ON UPDATE CASCADE,
  CONSTRAINT `chk_payment_amount`
    CHECK (`Amount` > 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Samurdhi payment disbursements generated after ministerial approval.';

-- Re-enable FK checks
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- VERIFICATION — DUMMY DATA
-- Insertion order respects FK dependencies:
--   USERS → subclasses → HOME_VISIT → WELFARE_APPLICATION
--        → MINISTER_APPROVAL → SAMURDHI_PAYMENT
-- =============================================================================

-- ── 1. USERS (superclass rows) ───────────────────────────────────────────────
-- Passwords are bcrypt hashes of 'Password@123' (cost 12) — replace before prod.
INSERT INTO `USERS` (`User_ID`, `Username`, `Password`, `Role`, `Phone_Num`) VALUES
  (1,  'admin_root',  '$2a$12$exampleHashForAdmin000000000000000000000000000000000', 'Admin',            '0711000001'),
  (2,  'minister_01', '$2a$12$exampleHashForMinist0000000000000000000000000000000', 'Minister',         '0711000002'),
  (3,  'gn_colombo',  '$2a$12$exampleHashForGN00000000000000000000000000000000000', 'Grama_Niladhari',  '0711000003'),
  (4,  'officer_01',  '$2a$12$exampleHashForOfficer000000000000000000000000000000', 'Samurdhi_Officer', '0711000004'),
  (5,  'applicant_01','$2a$12$exampleHashForApplica0000000000000000000000000000000','Applicant',        '0711000005'),
  (6,  'applicant_02','$2a$12$exampleHashForApplica0000000000000000000000000000001','Applicant',        '0711000006');

-- ── 2. Subclass tables ───────────────────────────────────────────────────────
INSERT INTO `ADMIN`     (`Admin_ID`)   VALUES (1);
INSERT INTO `MINISTER`  (`Minister_ID`) VALUES (2);

INSERT INTO `GRAMA_NILADHARI` (`GN_ID`, `Division`) VALUES
  (3, 'Colombo North');

INSERT INTO `SAMURDHI_OFFICER` (`Officer_ID`, `Area`) VALUES
  (4, 'Colombo District');

INSERT INTO `APPLICANT` (`Applicant_ID`, `Full_Name`, `Address`, `Monthly_Income`) VALUES
  (5, 'Kamal Perera',  '12/A Baseline Road, Colombo 09', 14500.00),
  (6, 'Nimal Silva',   '88 Galle Road, Panadura',        22000.00);

-- ── 3. HOME_VISIT ────────────────────────────────────────────────────────────
INSERT INTO `HOME_VISIT` (`Visit_ID`, `Remarks`, `Recommendation`, `Date`, `Officer_ID`) VALUES
  (1, 'Single-room dwelling, no stable income source observed.', 'Highly Recommended', '2026-06-10 09:30:00', 4),
  (2, 'Two-room house, small vegetable garden, marginal income.',  'Recommended',       '2026-06-11 14:00:00', 4);

-- ── 4. WELFARE_APPLICATION ───────────────────────────────────────────────────
INSERT INTO `WELFARE_APPLICATION` (`Application_ID`, `Status`, `Date`, `Applicant_ID`, `Visit_ID`) VALUES
  (1, 'Forwarded',    '2026-06-05 08:00:00', 5, 1),
  (2, 'Under Review', '2026-06-06 09:15:00', 6, 2);

-- ── 5. MINISTER_APPROVAL ─────────────────────────────────────────────────────
INSERT INTO `MINISTER_APPROVAL` (`Request_ID`, `Status`, `Date`, `GN_ID`, `Application_ID`, `Minister_ID`) VALUES
  (1, 'Approved', '2026-06-15 11:00:00', 3, 1, 2),
  (2, 'Pending',  '2026-06-16 10:30:00', 3, 2, 2);

-- ── 6. SAMURDHI_PAYMENT ──────────────────────────────────────────────────────
INSERT INTO `SAMURDHI_PAYMENT` (`Payment_ID`, `Amount`, `Date`, `Status`, `Request_ID`, `Applicant_ID`) VALUES
  (1, 5000.00, '2026-06-20 00:00:00', 'Completed', 1, 5);

-- =============================================================================
-- QUICK VERIFICATION QUERIES
-- Run these after inserting to confirm all joins resolve correctly.
-- =============================================================================

/*
-- Full user + role summary
SELECT u.User_ID, u.Username, u.Role,
       a.Full_Name, a.Monthly_Income
FROM   USERS u
LEFT   JOIN APPLICANT a ON a.Applicant_ID = u.User_ID;

-- Application workflow: applicant → visit → approval → payment
SELECT
  wa.Application_ID,
  ap.Full_Name        AS Applicant,
  hv.Recommendation   AS Visit_Result,
  wa.Status           AS App_Status,
  ma.Status           AS Approval_Status,
  sp.Amount           AS Payment_Amount,
  sp.Status           AS Payment_Status
FROM   WELFARE_APPLICATION wa
JOIN   APPLICANT           ap ON ap.Applicant_ID = wa.Applicant_ID
LEFT   JOIN HOME_VISIT     hv ON hv.Visit_ID     = wa.Visit_ID
LEFT   JOIN MINISTER_APPROVAL ma ON ma.Application_ID = wa.Application_ID
LEFT   JOIN SAMURDHI_PAYMENT  sp ON sp.Request_ID     = ma.Request_ID;
*/
