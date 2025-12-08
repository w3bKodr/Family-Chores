


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


ALTER SCHEMA "public" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."approve_parent_join_request"("request_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  request parent_join_requests;
  result json;
BEGIN
  -- Fetch the request and validate caller is the family owner
  SELECT * INTO request
  FROM parent_join_requests
  WHERE id = request_id
  AND family_id IN (SELECT id FROM families WHERE parent_id = auth.uid());

  IF request IS NULL THEN
    RAISE EXCEPTION 'Request not found or you do not have permission to approve it';
  END IF;

  -- Update the requesting user's family_id
  UPDATE users
  SET family_id = request.family_id
  WHERE id = request.user_id
  RETURNING json_build_object('id', id, 'family_id', family_id, 'display_name', display_name) INTO result;

  -- Mark the request as approved
  UPDATE parent_join_requests
  SET status = 'approved'
  WHERE id = request_id;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."approve_parent_join_request"("request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_parent_join_request"("request_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted json;
BEGIN
  -- Check if the caller is the request owner
  IF EXISTS (SELECT 1 FROM public.parent_join_requests WHERE id = request_id AND user_id = auth.uid()) THEN
    DELETE FROM public.parent_join_requests WHERE id = request_id RETURNING row_to_json(parent_join_requests.*) INTO deleted;
    RETURN deleted;
  END IF;

  -- Or check if caller is the family owner for the request's family
  IF EXISTS (
    SELECT 1 FROM public.parent_join_requests p
    JOIN public.families f ON f.id = p.family_id
    WHERE p.id = request_id AND f.parent_id = auth.uid()
  ) THEN
    DELETE FROM public.parent_join_requests WHERE id = request_id RETURNING row_to_json(parent_join_requests.*) INTO deleted;
    RETURN deleted;
  END IF;

  RAISE EXCEPTION 'Not authorized to cancel this parent join request';
END;
$$;


ALTER FUNCTION "public"."cancel_parent_join_request"("request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_or_update_parent_join_request"("p_family_id" "uuid", "p_user_id" "uuid", "p_display_name" "text", "p_user_email" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  request parent_join_requests;
  result json;
BEGIN
  -- Try to get existing request
  SELECT * INTO request
  FROM parent_join_requests
  WHERE family_id = p_family_id AND user_id = p_user_id;

  IF request IS NULL THEN
    -- Create new request
    INSERT INTO parent_join_requests (family_id, user_id, display_name, user_email, status)
    VALUES (p_family_id, p_user_id, p_display_name, p_user_email, 'pending')
    RETURNING * INTO request;
  ELSE
    -- Update existing request to pending (allows re-requesting)
    UPDATE parent_join_requests
    SET status = 'pending', display_name = p_display_name, user_email = p_user_email
    WHERE family_id = p_family_id AND user_id = p_user_id
    RETURNING * INTO request;
  END IF;

  RETURN json_build_object(
    'id', request.id,
    'family_id', request.family_id,
    'user_id', request.user_id,
    'status', request.status
  );
END;
$$;


ALTER FUNCTION "public"."create_or_update_parent_join_request"("p_family_id" "uuid", "p_user_id" "uuid", "p_display_name" "text", "p_user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_family_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT family_id 
  FROM public.users 
  WHERE id = auth.uid()
  LIMIT 1;
$$;


ALTER FUNCTION "public"."current_user_family_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_family_by_code"("p_code" "text") RETURNS TABLE("id" "uuid", "name" "text", "family_code" "text", "parent_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT id, name, family_code, parent_id
  FROM public.families
  WHERE family_code = upper(p_code)
  LIMIT 1;
$$;


ALTER FUNCTION "public"."find_family_by_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_family_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_code TEXT;
  done BOOL;
BEGIN
  done := false;
  WHILE NOT done LOOP
    -- Generate a 6-character alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    -- Check if it already exists
    done := NOT EXISTS(SELECT 1 FROM families WHERE family_code = new_code);
  END LOOP;
  RETURN new_code;
END;
$$;


ALTER FUNCTION "public"."generate_family_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_family_member"("_family_id" "uuid", "_user" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.children ch WHERE ch.family_id = _family_id AND ch.user_id = _user
    UNION
    SELECT 1 FROM public.users u WHERE u.family_id = _family_id AND u.id = _user
  );
$$;


ALTER FUNCTION "public"."is_family_member"("_family_id" "uuid", "_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_parent_from_family"("target_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  family_uuid uuid;
  result json;
BEGIN
  -- Check if caller is the family owner and get family_id
  SELECT f.id INTO family_uuid
  FROM families f
  INNER JOIN users u ON u.id = target_user_id
  WHERE f.id = u.family_id
  AND f.parent_id = auth.uid();

  IF family_uuid IS NULL THEN
    RAISE EXCEPTION 'Only family owner can remove parents';
  END IF;

  -- Prevent owner from removing themselves
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove yourself, use leave family instead';
  END IF;

  -- Delete any old parent join requests for this user so they can rejoin
  DELETE FROM parent_join_requests
  WHERE family_id = family_uuid AND user_id = target_user_id;

  -- Update the user's family_id to null
  UPDATE users
  SET family_id = NULL
  WHERE id = target_user_id
  RETURNING json_build_object('id', id, 'display_name', display_name) INTO result;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."remove_parent_from_family"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_profile"("p_display_name" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result json;
BEGIN
  UPDATE users
  SET display_name = p_display_name
  WHERE id = auth.uid()
  RETURNING json_build_object('id', id, 'display_name', display_name) INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."update_user_profile"("p_display_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_profile"("p_display_name" "text" DEFAULT NULL::"text", "p_emoji" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result json;
  v_display_name text;
  v_emoji text;
BEGIN
  -- Get current values
  SELECT display_name, emoji INTO v_display_name, v_emoji
  FROM users
  WHERE id = auth.uid();

  -- Use provided values or keep existing
  v_display_name := COALESCE(p_display_name, v_display_name);
  v_emoji := COALESCE(p_emoji, v_emoji);

  -- Update the user
  UPDATE users
  SET display_name = v_display_name,
      emoji = v_emoji
  WHERE id = auth.uid()
  RETURNING json_build_object(
    'id', id, 
    'display_name', display_name,
    'emoji', emoji
  ) INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."update_user_profile"("p_display_name" "text", "p_emoji" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."children" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "display_name" "text" NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'approved'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "emoji" "text" DEFAULT '👶'::"text" NOT NULL,
    "order" integer DEFAULT 0,
    CONSTRAINT "children_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);

ALTER TABLE ONLY "public"."children" REPLICA IDENTITY FULL;


ALTER TABLE "public"."children" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chore_completions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "chore_id" "uuid" NOT NULL,
    "completed_by" "uuid" NOT NULL,
    "completed_date" "date" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chore_completions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);

ALTER TABLE ONLY "public"."chore_completions" REPLICA IDENTITY FULL;


ALTER TABLE "public"."chore_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chores" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "assigned_to" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "points" integer DEFAULT 0 NOT NULL,
    "emoji" "text" DEFAULT '✓'::"text" NOT NULL,
    "repeating_days" "text"[] DEFAULT ARRAY['Monday'::"text", 'Tuesday'::"text", 'Wednesday'::"text", 'Thursday'::"text", 'Friday'::"text", 'Saturday'::"text", 'Sunday'::"text"],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."chores" REPLICA IDENTITY FULL;


ALTER TABLE "public"."chores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."families" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "family_code" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "parent_pin" "text"
);

ALTER TABLE ONLY "public"."families" REPLICA IDENTITY FULL;


ALTER TABLE "public"."families" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."join_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "join_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);

ALTER TABLE ONLY "public"."join_requests" REPLICA IDENTITY FULL;


ALTER TABLE "public"."join_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parent_join_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "display_name" "text",
    "user_email" "text",
    CONSTRAINT "parent_join_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);

ALTER TABLE ONLY "public"."parent_join_requests" REPLICA IDENTITY FULL;


ALTER TABLE "public"."parent_join_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reward_claims" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "reward_id" "uuid" NOT NULL,
    "child_id" "uuid" NOT NULL,
    "claimed_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    CONSTRAINT "reward_claims_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);

ALTER TABLE ONLY "public"."reward_claims" REPLICA IDENTITY FULL;


ALTER TABLE "public"."reward_claims" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rewards" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "points_required" integer NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "emoji" "text" DEFAULT '🎁'::"text" NOT NULL
);

ALTER TABLE ONLY "public"."rewards" REPLICA IDENTITY FULL;


ALTER TABLE "public"."rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "family_id" "uuid",
    "display_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "emoji" "text" DEFAULT '👤'::"text",
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['parent'::"text", 'child'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."children"
    ADD CONSTRAINT "children_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chore_completions"
    ADD CONSTRAINT "chore_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_family_code_key" UNIQUE ("family_code");



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."join_requests"
    ADD CONSTRAINT "join_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parent_join_requests"
    ADD CONSTRAINT "parent_join_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reward_claims"
    ADD CONSTRAINT "reward_claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chore_completions"
    ADD CONSTRAINT "unique_completion" UNIQUE ("chore_id", "completed_date", "completed_by");



ALTER TABLE ONLY "public"."parent_join_requests"
    ADD CONSTRAINT "unique_parent_request" UNIQUE ("family_id", "user_id");



ALTER TABLE ONLY "public"."join_requests"
    ADD CONSTRAINT "unique_request" UNIQUE ("family_id", "user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_children_family_id" ON "public"."children" USING "btree" ("family_id");



CREATE INDEX "idx_children_family_order" ON "public"."children" USING "btree" ("family_id", "order");



CREATE INDEX "idx_children_user_id" ON "public"."children" USING "btree" ("user_id");



CREATE INDEX "idx_chore_completions_chore_id" ON "public"."chore_completions" USING "btree" ("chore_id");



CREATE INDEX "idx_chore_completions_completed_by" ON "public"."chore_completions" USING "btree" ("completed_by");



CREATE INDEX "idx_chore_completions_completed_date" ON "public"."chore_completions" USING "btree" ("completed_date");



CREATE INDEX "idx_chores_assigned_to" ON "public"."chores" USING "btree" ("assigned_to");



CREATE INDEX "idx_chores_family_id" ON "public"."chores" USING "btree" ("family_id");



CREATE INDEX "idx_families_family_code" ON "public"."families" USING "btree" ("family_code");



CREATE INDEX "idx_families_parent_id" ON "public"."families" USING "btree" ("parent_id");



CREATE INDEX "idx_join_requests_family_id" ON "public"."join_requests" USING "btree" ("family_id");



CREATE INDEX "idx_join_requests_user_id" ON "public"."join_requests" USING "btree" ("user_id");



CREATE INDEX "idx_parent_join_requests_family_id" ON "public"."parent_join_requests" USING "btree" ("family_id");



CREATE INDEX "idx_parent_join_requests_status" ON "public"."parent_join_requests" USING "btree" ("status");



CREATE INDEX "idx_parent_join_requests_user_id" ON "public"."parent_join_requests" USING "btree" ("user_id");



CREATE INDEX "idx_reward_claims_child_id" ON "public"."reward_claims" USING "btree" ("child_id");



CREATE INDEX "idx_reward_claims_reward_id" ON "public"."reward_claims" USING "btree" ("reward_id");



CREATE INDEX "idx_reward_claims_status" ON "public"."reward_claims" USING "btree" ("status");



CREATE INDEX "idx_rewards_family_id" ON "public"."rewards" USING "btree" ("family_id");



CREATE INDEX "idx_users_family_id" ON "public"."users" USING "btree" ("family_id");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE UNIQUE INDEX "unique_child_user" ON "public"."children" USING "btree" ("family_id", "user_id") WHERE ("user_id" IS NOT NULL);



ALTER TABLE ONLY "public"."chore_completions"
    ADD CONSTRAINT "fk_approved_by" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "fk_assigned_to" FOREIGN KEY ("assigned_to") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reward_claims"
    ADD CONSTRAINT "fk_child" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chore_completions"
    ADD CONSTRAINT "fk_chore" FOREIGN KEY ("chore_id") REFERENCES "public"."chores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chore_completions"
    ADD CONSTRAINT "fk_completed_by" FOREIGN KEY ("completed_by") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "fk_family" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."join_requests"
    ADD CONSTRAINT "fk_family" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."children"
    ADD CONSTRAINT "fk_family" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "fk_family" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "fk_family" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parent_join_requests"
    ADD CONSTRAINT "fk_family" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "fk_parent" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reward_claims"
    ADD CONSTRAINT "fk_reward" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."join_requests"
    ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."children"
    ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parent_join_requests"
    ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reward_claims"
    ADD CONSTRAINT "reward_claims_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id");



CREATE POLICY "Anyone can read families by family_code for joining" ON "public"."families" FOR SELECT TO "anon" USING (("family_code" IS NOT NULL));



CREATE POLICY "Children can claim rewards" ON "public"."reward_claims" FOR INSERT WITH CHECK (("child_id" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."user_id" = "auth"."uid"()))));



CREATE POLICY "Children can insert completions" ON "public"."chore_completions" FOR INSERT WITH CHECK (("completed_by" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."user_id" = "auth"."uid"()))));



CREATE POLICY "Dashboard user read" ON "public"."users" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "id") OR ("family_id" = "public"."current_user_family_id"())));



CREATE POLICY "Dashboard user read families (consolidated)" ON "public"."families" FOR SELECT TO "dashboard_user" USING ((("parent_id" = "auth"."uid"()) OR ("id" = "public"."current_user_family_id"()) OR (("family_code" IS NOT NULL) AND ("family_code" = ("auth"."jwt"() ->> 'join_code'::"text")))));



CREATE POLICY "Dashboard user update consolidated" ON "public"."users" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "id") OR ("family_id" IS NULL) OR ("family_id" IN ( SELECT "families"."id"
   FROM "public"."families"
  WHERE ("families"."parent_id" = "auth"."uid"()))))) WITH CHECK ((("auth"."uid"() = "id") OR ("family_id" IS NULL) OR ("family_id" IN ( SELECT "families"."id"
   FROM "public"."families"
  WHERE ("families"."parent_id" = "auth"."uid"())))));



CREATE POLICY "Family members can read children" ON "public"."children" FOR SELECT TO "dashboard_user", "authenticated" USING (("family_id" = "public"."current_user_family_id"()));



CREATE POLICY "Family members can read chores" ON "public"."chores" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."family_id" = "chores"."family_id")))));



CREATE POLICY "Family members can read claims" ON "public"."reward_claims" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."children" "c"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("c"."id" = "reward_claims"."child_id") AND ("c"."family_id" = "u"."family_id")))));



CREATE POLICY "Family members can read completions" ON "public"."chore_completions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."chores" "c"
     JOIN "public"."users" "u" ON (("u"."id" = "auth"."uid"())))
  WHERE (("c"."id" = "chore_completions"."chore_id") AND ("c"."family_id" = "u"."family_id")))));



CREATE POLICY "Family members can read rewards" ON "public"."rewards" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."family_id" = "rewards"."family_id")))));



CREATE POLICY "Family owners can delete parent join requests" ON "public"."parent_join_requests" FOR DELETE USING (("family_id" IN ( SELECT "families"."id"
   FROM "public"."families"
  WHERE ("families"."parent_id" = "auth"."uid"()))));



CREATE POLICY "Family owners can update parent join requests" ON "public"."parent_join_requests" FOR UPDATE USING (("family_id" IN ( SELECT "families"."id"
   FROM "public"."families"
  WHERE ("families"."parent_id" = "auth"."uid"()))));



CREATE POLICY "Parents and family members can read own family" ON "public"."families" FOR SELECT TO "authenticated" USING ((("parent_id" = "auth"."uid"()) OR ("id" = "public"."current_user_family_id"())));



CREATE POLICY "Parents can delete children" ON "public"."children" FOR DELETE TO "authenticated" USING ((("family_id" = "public"."current_user_family_id"()) OR ("family_id" IN ( SELECT "families"."id"
   FROM "public"."families"
  WHERE ("families"."parent_id" = "auth"."uid"())))));



CREATE POLICY "Parents can delete chores" ON "public"."chores" FOR DELETE USING (("family_id" = ( SELECT "chores"."family_id"
   FROM "public"."families"
  WHERE ("families"."parent_id" = "auth"."uid"()))));



CREATE POLICY "Parents can delete completions" ON "public"."chore_completions" FOR DELETE USING (("chore_id" IN ( SELECT "chores"."id"
   FROM "public"."chores"
  WHERE ("chores"."family_id" IN ( SELECT "families"."id"
           FROM "public"."families"
          WHERE ("families"."parent_id" = "auth"."uid"()))))));



CREATE POLICY "Parents can delete rewards" ON "public"."rewards" FOR DELETE USING (("family_id" = ( SELECT "rewards"."family_id"
   FROM "public"."families"
  WHERE ("families"."parent_id" = "auth"."uid"()))));



CREATE POLICY "Parents can insert children" ON "public"."children" FOR INSERT TO "authenticated" WITH CHECK ((("family_id" = "public"."current_user_family_id"()) OR ("family_id" IN ( SELECT "families"."id"
   FROM "public"."families"
  WHERE ("families"."parent_id" = "auth"."uid"())))));



CREATE POLICY "Parents can insert chores" ON "public"."chores" FOR INSERT WITH CHECK (("family_id" = ( SELECT "chores"."family_id"
   FROM "public"."families"
  WHERE ("families"."parent_id" = "auth"."uid"()))));



CREATE POLICY "Parents can insert family" ON "public"."families" FOR INSERT TO "authenticated" WITH CHECK (("parent_id" = "auth"."uid"()));



CREATE POLICY "Parents can insert rewards" ON "public"."rewards" FOR INSERT WITH CHECK (("family_id" = ( SELECT "rewards"."family_id"
   FROM "public"."families"
  WHERE ("families"."parent_id" = "auth"."uid"()))));



CREATE POLICY "Parents can update children" ON "public"."children" FOR UPDATE TO "authenticated" USING ((("family_id" = "public"."current_user_family_id"()) OR ("family_id" IN ( SELECT "families"."id"
   FROM "public"."families"
  WHERE ("families"."parent_id" = "auth"."uid"())))));



CREATE POLICY "Parents can update chores" ON "public"."chores" FOR UPDATE USING (("family_id" = ( SELECT "chores"."family_id"
   FROM "public"."families"
  WHERE ("families"."parent_id" = "auth"."uid"()))));



CREATE POLICY "Parents can update claims" ON "public"."reward_claims" FOR UPDATE USING ((("child_id" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."family_id" IN ( SELECT "families"."id"
           FROM "public"."families"
          WHERE ("families"."parent_id" = "auth"."uid"()))))) OR ("child_id" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."family_id" IN ( SELECT "users"."family_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"())))))));



CREATE POLICY "Parents can update completions" ON "public"."chore_completions" FOR UPDATE USING (("chore_id" IN ( SELECT "chores"."id"
   FROM "public"."chores"
  WHERE ("chores"."family_id" = ( SELECT "chores"."family_id"
           FROM "public"."families"
          WHERE ("families"."parent_id" = "auth"."uid"()))))));



CREATE POLICY "Parents can update join requests" ON "public"."join_requests" FOR UPDATE USING (("family_id" IN ( SELECT "families"."id"
   FROM "public"."families"
  WHERE ("families"."parent_id" = "auth"."uid"()))));



CREATE POLICY "Parents can update own family" ON "public"."families" FOR UPDATE TO "authenticated" USING (("parent_id" = "auth"."uid"()));



CREATE POLICY "Parents can update rewards" ON "public"."rewards" FOR UPDATE USING (("family_id" = ( SELECT "rewards"."family_id"
   FROM "public"."families"
  WHERE ("families"."parent_id" = "auth"."uid"()))));



CREATE POLICY "Temp restore children select" ON "public"."children" FOR SELECT TO "authenticated" USING (("family_id" = "public"."current_user_family_id"()));



CREATE POLICY "Temp restore users select" ON "public"."users" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "id") OR ("family_id" = "public"."current_user_family_id"())));



CREATE POLICY "Users can insert join requests" ON "public"."join_requests" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own parent join requests" ON "public"."parent_join_requests" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own profile" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can read own join requests" ON "public"."join_requests" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("family_id" IN ( SELECT "families"."id"
   FROM "public"."families"
  WHERE ("families"."parent_id" = "auth"."uid"())))));



CREATE POLICY "Users can read own parent join requests" ON "public"."parent_join_requests" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("family_id" IN ( SELECT "families"."id"
   FROM "public"."families"
  WHERE ("families"."parent_id" = "auth"."uid"())))));



ALTER TABLE "public"."children" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chore_completions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."families" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."join_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parent_join_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reward_claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rewards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO "anon";
GRANT ALL ON SCHEMA "public" TO "authenticated";
GRANT ALL ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_parent_join_request"("request_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."cancel_parent_join_request"("request_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."create_or_update_parent_join_request"("p_family_id" "uuid", "p_user_id" "uuid", "p_display_name" "text", "p_user_email" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."find_family_by_code"("p_code" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."remove_parent_from_family"("target_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."update_user_profile"("p_display_name" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."update_user_profile"("p_display_name" "text", "p_emoji" "text") TO "authenticated";



GRANT SELECT ON TABLE "public"."children" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."children" TO "authenticated";



GRANT SELECT ON TABLE "public"."chore_completions" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."chore_completions" TO "authenticated";



GRANT SELECT ON TABLE "public"."chores" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."chores" TO "authenticated";



GRANT SELECT ON TABLE "public"."families" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."families" TO "authenticated";



GRANT SELECT ON TABLE "public"."join_requests" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."join_requests" TO "authenticated";



GRANT SELECT ON TABLE "public"."parent_join_requests" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."parent_join_requests" TO "authenticated";



GRANT SELECT ON TABLE "public"."reward_claims" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."reward_claims" TO "authenticated";



GRANT SELECT ON TABLE "public"."rewards" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rewards" TO "authenticated";



GRANT SELECT ON TABLE "public"."users" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."users" TO "authenticated";




