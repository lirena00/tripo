CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"trip_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"paid_by" uuid NOT NULL,
	"title" text NOT NULL,
	"location" text,
	"amount_paise" bigint NOT NULL,
	"split_type" text NOT NULL,
	"spent_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_positive_amount" CHECK ("amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"trip_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_splits" (
	"expense_id" uuid,
	"member_id" uuid,
	"share_paise" bigint NOT NULL,
	"split_value" bigint,
	CONSTRAINT "expense_splits_pkey" PRIMARY KEY("expense_id","member_id"),
	CONSTRAINT "expense_splits_nonnegative_share" CHECK ("share_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"destination" text,
	"currency" text DEFAULT 'INR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"trip_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"subject" text NOT NULL,
	"expense_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"trip_id" uuid NOT NULL,
	"invitee_id" text NOT NULL,
	"inviter_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trip_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"trip_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "expenses_trip_date_idx" ON "expenses" ("trip_id","spent_on","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "expense_categories_trip_name_idx" ON "expense_categories" ("trip_id",lower("name"));--> statement-breakpoint
CREATE INDEX "expense_splits_member_idx" ON "expense_splits" ("member_id");--> statement-breakpoint
CREATE INDEX "trip_activity_date_idx" ON "trip_activity" ("trip_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_invitations_pending_idx" ON "trip_invitations" ("trip_id","invitee_id") WHERE "status" = 'pending';--> statement-breakpoint
CREATE INDEX "trip_invitations_inbox_idx" ON "trip_invitations" ("invitee_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_members_trip_user_idx" ON "trip_members" ("trip_id","user_id");--> statement-breakpoint
CREATE INDEX "trip_members_user_idx" ON "trip_members" ("user_id");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_trip_id_trips_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_trip_members_id_fkey" FOREIGN KEY ("paid_by") REFERENCES "trip_members"("id");--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_trip_id_trips_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_expense_id_expenses_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_member_id_trip_members_id_fkey" FOREIGN KEY ("member_id") REFERENCES "trip_members"("id");--> statement-breakpoint
ALTER TABLE "trip_activity" ADD CONSTRAINT "trip_activity_trip_id_trips_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trip_activity" ADD CONSTRAINT "trip_activity_actor_id_user_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "trip_activity" ADD CONSTRAINT "trip_activity_expense_id_expenses_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id");--> statement-breakpoint
ALTER TABLE "trip_invitations" ADD CONSTRAINT "trip_invitations_trip_id_trips_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trip_invitations" ADD CONSTRAINT "trip_invitations_invitee_id_user_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "trip_invitations" ADD CONSTRAINT "trip_invitations_inviter_id_user_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_trip_id_trips_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");