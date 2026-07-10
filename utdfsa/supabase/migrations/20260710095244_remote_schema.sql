


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."record_attendance"("p_member_id" "uuid", "p_event_id" "uuid", "p_points" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_new boolean := false;
begin
  insert into public.attendance (member_id, event_id)
  values (p_member_id, p_event_id)
  on conflict (member_id, event_id) do nothing;

  -- FOUND is true only when the insert created a row (no conflict)
  if found then
    v_new := true;
    if coalesce(p_points, 0) > 0 then
      update public.members
      set points = coalesce(points, 0) + p_points
      where id = p_member_id;
    end if;
  end if;

  return v_new;
end;
$$;


ALTER FUNCTION "public"."record_attendance"("p_member_id" "uuid", "p_event_id" "uuid", "p_points" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ading_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "submitted_at" timestamp with time zone,
    "additional_notes" "text",
    "status" "text",
    "instagram" "text",
    "phone" "text",
    "birthday" "date",
    "pronouns" "text",
    "activity_level" integer,
    "hobbies" "text",
    "fave_music_genre" "text",
    "fave_artist" "text",
    "fave_food" "text",
    "pam_vibe" "text",
    "hangout_size_preference" integer,
    "fave_tv_show_movie" "text",
    "availability" "jsonb",
    "thoughts_on_drinking" "text",
    "dislikes" "text",
    "pam_dealbreakers" "text",
    "future_kuyate" "text",
    "mbti" "text",
    "pam_incompatibilities" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "ading_applications_activity_level_check" CHECK ((("activity_level" >= 1) AND ("activity_level" <= 10))),
    CONSTRAINT "ading_applications_hangout_size_preference_check" CHECK ((("hangout_size_preference" >= 1) AND ("hangout_size_preference" <= 10)))
);


ALTER TABLE "public"."ading_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid",
    "event_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid",
    "event_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "guest_email" "text",
    "guest_fname" "text",
    "guest_lname" "text",
    "num_tickets" integer DEFAULT 1 NOT NULL,
    "amt_expected" integer NOT NULL,
    "amt_paid" integer,
    "payment_verified_at" timestamp with time zone,
    "payment_provider" "text" DEFAULT 'stripe'::"text",
    "stripe_checkout_session_id" "text",
    "stripe_payment_intent_id" "text",
    "payment_method" "text",
    "payment_metadata" "jsonb",
    "tickets_viewed_at" timestamp with time zone,
    CONSTRAINT "check_member_single_ticket" CHECK ((("member_id" IS NULL) OR ("num_tickets" = 1))),
    CONSTRAINT "event_registrations_num_tickets_check" CHECK (("num_tickets" > 0)),
    CONSTRAINT "event_registrations_payment_provider_check" CHECK (("payment_provider" = ANY (ARRAY['stripe'::"text", 'paypal'::"text", 'venmo'::"text", 'zelle'::"text", 'cash'::"text"]))),
    CONSTRAINT "event_registrations_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'failed'::"text"]))),
    CONSTRAINT "member_or_guest_check" CHECK ((("member_id" IS NOT NULL) OR ("guest_email" IS NOT NULL)))
);


ALTER TABLE "public"."event_registrations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."event_registrations"."tickets_viewed_at" IS 'set the first time the post-checkout success page renders this registration''s ticket QR codes; once set, the sid link no longer re-displays live QR codes, preventing indefinite replay of a leaked checkout link.';



CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "event_type" "text" NOT NULL,
    "event_date" timestamp with time zone NOT NULL,
    "location" "text",
    "points" integer DEFAULT 0,
    "attend_qr_token" "text",
    "attend_qr_open" boolean DEFAULT false,
    "attend_qr_expires_at" timestamp with time zone,
    "price_cents_members" integer DEFAULT 0 NOT NULL,
    "price_cents_nonmembers" integer DEFAULT 0 NOT NULL,
    "eb_price_members" integer DEFAULT 0,
    "eb_price_nonmembers" integer DEFAULT 0,
    "eb_deadline" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "cover_photo_url" "text",
    "registration_closes_at" timestamp with time zone,
    "is_visible" boolean DEFAULT true NOT NULL,
    "event_end" timestamp with time zone
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."galleries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "cover_photo_url" "text" NOT NULL,
    "google_photos_url" "text",
    "event_id" "uuid",
    "semester" "text",
    "year" integer,
    "created_by" "uuid" NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."galleries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "membership_status" "text" DEFAULT '''pending''::text'::"text",
    "membership_expires_at" timestamp with time zone,
    "amt_paid" integer,
    "payment_verified_at" timestamp with time zone,
    "points" integer DEFAULT 0,
    "phone" "text",
    "year" "text",
    "major" "text",
    "pamilya" "text",
    "payment_provider" "text",
    "stripe_checkout_session_id" "text",
    "stripe_payment_intent_id" "text",
    "payment_method" "text",
    "payment_metadata" "jsonb",
    "stripe_customer_id" "text",
    "onboarding_complete" boolean DEFAULT false NOT NULL,
    "avatar_url" "text",
    "contact_email" "text",
    "member_type" "text",
    CONSTRAINT "members_member_type_check" CHECK (("member_type" = ANY (ARRAY['ading'::"text", 'kuyate'::"text", 'not_interested'::"text"]))),
    CONSTRAINT "members_membership_status_check" CHECK (("membership_status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'expired'::"text"]))),
    CONSTRAINT "members_payment_provider_check" CHECK (("payment_provider" = ANY (ARRAY['stripe'::"text", 'paypal'::"text", 'venmo'::"text", 'zelle'::"text", 'cash'::"text"]))),
    CONSTRAINT "members_role_check" CHECK (("role" = ANY (ARRAY['member'::"text", 'officer'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."members" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."goodphil_eligibility" WITH ("security_invoker"='true') AS
 SELECT "m"."id",
    "m"."first_name",
    "m"."last_name",
    "m"."email",
    "m"."pamilya",
    "m"."points",
    ("m"."membership_status" = 'active'::"text") AS "dues_paid",
    ("att"."risk_mgmt_count" > 0) AS "attended_risk_mgmt",
    "att"."meeting_count" AS "total_meetings_attended",
    ("m"."points" >= 6) AS "meets_points_requirement",
    (("m"."membership_status" = 'active'::"text") AND ("m"."points" >= 6) AND ("att"."meeting_count" >= 3) AND ("att"."risk_mgmt_count" > 0)) AS "automated_requirements_met"
   FROM ("public"."members" "m"
     LEFT JOIN LATERAL ( SELECT "count"(*) FILTER (WHERE ("e"."event_type" = ANY (ARRAY['General Meeting'::"text", 'Risk Management'::"text"]))) AS "meeting_count",
            "count"(*) FILTER (WHERE ("e"."event_type" = 'Risk Management'::"text")) AS "risk_mgmt_count"
           FROM ("public"."attendance" "a"
             JOIN "public"."events" "e" ON (("e"."id" = "a"."event_id")))
          WHERE ("a"."member_id" = "m"."id")) "att" ON (true))
  WHERE ("m"."membership_status" = 'active'::"text")
  ORDER BY "m"."last_name", "m"."first_name";


ALTER VIEW "public"."goodphil_eligibility" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kuyate_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "submitted_at" timestamp with time zone,
    "additional_notes" "text",
    "status" "text",
    "instagram" "text",
    "pamilya_name" "text",
    "wants_to_be_pam_head" boolean DEFAULT false NOT NULL,
    "pam_head_phone" "text",
    "acknowledges_responsibilities" boolean DEFAULT false NOT NULL,
    "why_kuyate" "text",
    "status_email_sent_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone
);


ALTER TABLE "public"."kuyate_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registration_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "registration_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "qr_code" "text" NOT NULL,
    "attendee_fname" "text",
    "attendee_lname" "text",
    "attendee_email" "text",
    "checked_in" boolean DEFAULT false NOT NULL,
    "checked_in_at" timestamp with time zone,
    "checked_in_by" "uuid"
);


ALTER TABLE "public"."registration_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ading_applications"
    ADD CONSTRAINT "ading_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_stripe_checkout_session_id_key" UNIQUE ("stripe_checkout_session_id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_qr_token_key" UNIQUE ("attend_qr_token");



ALTER TABLE ONLY "public"."galleries"
    ADD CONSTRAINT "galleries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kuyate_applications"
    ADD CONSTRAINT "kuyate_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_stripe_checkout_session_id_key" UNIQUE ("stripe_checkout_session_id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."registration_tickets"
    ADD CONSTRAINT "registration_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registration_tickets"
    ADD CONSTRAINT "registration_tickets_qr_code_key" UNIQUE ("qr_code");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "unique_member_event" UNIQUE ("member_id", "event_id");



CREATE INDEX "idx_attendance_member_id" ON "public"."attendance" USING "btree" ("member_id");



CREATE INDEX "idx_event_registrations_event_guest_email" ON "public"."event_registrations" USING "btree" ("event_id", "guest_email");



CREATE INDEX "idx_event_registrations_event_id" ON "public"."event_registrations" USING "btree" ("event_id");



CREATE INDEX "idx_event_registrations_member_id" ON "public"."event_registrations" USING "btree" ("member_id");



CREATE INDEX "idx_event_registrations_payment_status" ON "public"."event_registrations" USING "btree" ("payment_status");



CREATE INDEX "idx_paid_registrations" ON "public"."event_registrations" USING "btree" ("event_id") WHERE ("payment_status" = 'paid'::"text");



CREATE INDEX "idx_registration_tickets_registration_id" ON "public"."registration_tickets" USING "btree" ("registration_id");



CREATE UNIQUE INDEX "unique_member_event_registration" ON "public"."event_registrations" USING "btree" ("event_id", "member_id") WHERE ("member_id" IS NOT NULL);



ALTER TABLE ONLY "public"."ading_applications"
    ADD CONSTRAINT "ading_applications_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."ading_applications"
    ADD CONSTRAINT "ading_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."galleries"
    ADD CONSTRAINT "galleries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."galleries"
    ADD CONSTRAINT "galleries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."kuyate_applications"
    ADD CONSTRAINT "kuyate_applications_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."kuyate_applications"
    ADD CONSTRAINT "kuyate_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."registration_tickets"
    ADD CONSTRAINT "registration_tickets_checked_in_by_fkey" FOREIGN KEY ("checked_in_by") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."registration_tickets"
    ADD CONSTRAINT "registration_tickets_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "public"."event_registrations"("id") ON DELETE CASCADE;



ALTER TABLE "public"."ading_applications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ading_insert_own" ON "public"."ading_applications" FOR INSERT WITH CHECK (("member_id" = ( SELECT "members"."id"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "ading_select_own" ON "public"."ading_applications" FOR SELECT USING (("member_id" = ( SELECT "members"."id"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance_insert_own" ON "public"."attendance" FOR INSERT WITH CHECK (("member_id" = ( SELECT "members"."id"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "attendance_select_own" ON "public"."attendance" FOR SELECT USING (("member_id" = ( SELECT "members"."id"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



ALTER TABLE "public"."event_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_insert_officer" ON "public"."events" FOR INSERT WITH CHECK ((( SELECT "members"."role"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text"))) = ANY (ARRAY['officer'::"text", 'admin'::"text"])));



CREATE POLICY "events_select_public" ON "public"."events" FOR SELECT USING (("is_active" = true));



CREATE POLICY "events_update_officer" ON "public"."events" FOR UPDATE USING ((( SELECT "members"."role"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text"))) = ANY (ARRAY['officer'::"text", 'admin'::"text"])));



ALTER TABLE "public"."galleries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "galleries_insert_officer" ON "public"."galleries" FOR INSERT WITH CHECK ((( SELECT "members"."role"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text"))) = ANY (ARRAY['officer'::"text", 'admin'::"text"])));



CREATE POLICY "galleries_select_published" ON "public"."galleries" FOR SELECT USING (("is_published" = true));



CREATE POLICY "galleries_update_officer" ON "public"."galleries" FOR UPDATE USING ((( SELECT "members"."role"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text"))) = ANY (ARRAY['officer'::"text", 'admin'::"text"])));



ALTER TABLE "public"."kuyate_applications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kuyate_insert_own" ON "public"."kuyate_applications" FOR INSERT WITH CHECK (("member_id" = ( SELECT "members"."id"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "kuyate_select_own" ON "public"."kuyate_applications" FOR SELECT USING (("member_id" = ( SELECT "members"."id"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "members can read own row" ON "public"."members" FOR SELECT USING ((("auth"."jwt"() ->> 'email'::"text") = "email"));



CREATE POLICY "members can update own row" ON "public"."members" FOR UPDATE USING ((("auth"."jwt"() ->> 'email'::"text") = "email"));



ALTER TABLE "public"."registration_tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "registrations_select_own" ON "public"."event_registrations" FOR SELECT USING (("member_id" = ( SELECT "members"."id"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "settings_admin_update" ON "public"."settings" FOR UPDATE USING ((( SELECT "members"."role"
   FROM "public"."members"
  WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text"))) = 'admin'::"text"));



CREATE POLICY "settings_public_read" ON "public"."settings" FOR SELECT USING (true);



CREATE POLICY "tickets_select_own" ON "public"."registration_tickets" FOR SELECT USING (("registration_id" IN ( SELECT "event_registrations"."id"
   FROM "public"."event_registrations"
  WHERE ("event_registrations"."member_id" = ( SELECT "members"."id"
           FROM "public"."members"
          WHERE ("members"."email" = ("auth"."jwt"() ->> 'email'::"text")))))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_attendance"("p_member_id" "uuid", "p_event_id" "uuid", "p_points" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_attendance"("p_member_id" "uuid", "p_event_id" "uuid", "p_points" integer) TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ading_applications" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ading_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."ading_applications" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."attendance" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."event_registrations" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."event_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."event_registrations" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."events" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."galleries" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."galleries" TO "authenticated";
GRANT ALL ON TABLE "public"."galleries" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."members" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."members" TO "authenticated";
GRANT ALL ON TABLE "public"."members" TO "service_role";



GRANT ALL ON TABLE "public"."goodphil_eligibility" TO "anon";
GRANT ALL ON TABLE "public"."goodphil_eligibility" TO "authenticated";
GRANT ALL ON TABLE "public"."goodphil_eligibility" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."kuyate_applications" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."kuyate_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."kuyate_applications" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registration_tickets" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registration_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."registration_tickets" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."settings" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







