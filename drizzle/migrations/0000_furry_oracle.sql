CREATE TYPE "public"."api_provider" AS ENUM('serper', 'anthropic', 'apollo');--> statement-breakpoint
CREATE TYPE "public"."outreach_status" AS ENUM('pending', 'drafted', 'contacted', 'sent', 'replied', 'followup_due', 'dead');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "api_provider" NOT NULL,
	"encrypted_value" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_user_provider_uniq" UNIQUE("user_id","provider")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'custom' NOT NULL,
	"brief_md" text DEFAULT '' NOT NULL,
	"icp_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"priority_targets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"voice_rules" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_state" (
	"prospect_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "outreach_status" DEFAULT 'pending' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"drafts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"timeline" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"followup_due" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"company" text DEFAULT '' NOT NULL,
	"linkedin" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"email_source" text,
	"score" integer DEFAULT 0 NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"raw_notes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prospects_campaign_linkedin_uniq" UNIQUE("campaign_id","linkedin")
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"adapter" text DEFAULT 'serper' NOT NULL,
	"prospects_found" integer DEFAULT 0 NOT NULL,
	"prospects_kept" integer DEFAULT 0 NOT NULL,
	"error" text,
	"log" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "campaigns_user_id_idx" ON "campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "outreach_user_id_idx" ON "outreach_state" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "outreach_status_idx" ON "outreach_state" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prospects_campaign_idx" ON "prospects" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "prospects_user_score_idx" ON "prospects" USING btree ("user_id","score");--> statement-breakpoint
CREATE INDEX "runs_campaign_idx" ON "runs" USING btree ("campaign_id");