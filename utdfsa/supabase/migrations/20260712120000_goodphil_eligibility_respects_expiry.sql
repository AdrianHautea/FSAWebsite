-- goodphil_eligibility: treat membership as active only while membership_expires_at
-- is in the future (or null, for legacy rows). membership_status alone is not
-- authoritative — nothing flips it to 'expired' automatically. this mirrors
-- lib/membership.ts isMembershipActive(); if the rule changes, update both.

CREATE OR REPLACE VIEW "public"."goodphil_eligibility" WITH ("security_invoker"='true') AS
 SELECT "m"."id",
    "m"."first_name",
    "m"."last_name",
    "m"."email",
    "m"."pamilya",
    "m"."points",
    (("m"."membership_status" = 'active'::"text") AND (("m"."membership_expires_at" IS NULL) OR ("m"."membership_expires_at" > "now"()))) AS "dues_paid",
    ("att"."risk_mgmt_count" > 0) AS "attended_risk_mgmt",
    "att"."meeting_count" AS "total_meetings_attended",
    ("m"."points" >= 6) AS "meets_points_requirement",
    (("m"."membership_status" = 'active'::"text") AND (("m"."membership_expires_at" IS NULL) OR ("m"."membership_expires_at" > "now"())) AND ("m"."points" >= 6) AND ("att"."meeting_count" >= 3) AND ("att"."risk_mgmt_count" > 0)) AS "automated_requirements_met"
   FROM ("public"."members" "m"
     LEFT JOIN LATERAL ( SELECT "count"(*) FILTER (WHERE ("e"."event_type" = ANY (ARRAY['General Meeting'::"text", 'Risk Management'::"text"]))) AS "meeting_count",
            "count"(*) FILTER (WHERE ("e"."event_type" = 'Risk Management'::"text")) AS "risk_mgmt_count"
           FROM ("public"."attendance" "a"
             JOIN "public"."events" "e" ON (("e"."id" = "a"."event_id")))
          WHERE ("a"."member_id" = "m"."id")) "att" ON (true))
  WHERE (("m"."membership_status" = 'active'::"text") AND (("m"."membership_expires_at" IS NULL) OR ("m"."membership_expires_at" > "now"())))
  ORDER BY "m"."last_name", "m"."first_name";
