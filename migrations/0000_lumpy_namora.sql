CREATE TABLE `accounting_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` text NOT NULL,
	`entry_type` text NOT NULL,
	`source` text DEFAULT 'system' NOT NULL,
	`source_id` text,
	`description` text NOT NULL,
	`amount_cents` integer DEFAULT 0,
	`currency` text DEFAULT 'USD',
	`metadata` text DEFAULT '{}',
	`item_name` text,
	`category` text,
	`agent_name` text,
	`performed_by` text DEFAULT 'system',
	`notes` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounting_entries_entry_id_unique` ON `accounting_entries` (`entry_id`);--> statement-breakpoint
CREATE TABLE `admin_prompt_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prompt_id` text NOT NULL,
	`prompt_text` text NOT NULL,
	`target_agent` text DEFAULT 'all',
	`priority` integer DEFAULT 100 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`result` text,
	`error` text,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_prompt_queue_prompt_id_unique` ON `admin_prompt_queue` (`prompt_id`);--> statement-breakpoint
CREATE TABLE `agent_boundary_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cycle_id` text NOT NULL,
	`project_id` text NOT NULL,
	`task_id` text NOT NULL,
	`violation_type` text NOT NULL,
	`details` text NOT NULL,
	`blocked` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` text NOT NULL,
	`listing_id` integer,
	`item_name` text NOT NULL,
	`topic` text NOT NULL,
	`from_agent` text NOT NULL,
	`to_agent` text DEFAULT 'all',
	`message` text NOT NULL,
	`message_type` text DEFAULT 'insight',
	`boundary_checks` text DEFAULT '[]',
	`topic_verified` integer DEFAULT false,
	`safety_score` integer DEFAULT 100,
	`sources` text DEFAULT '[]',
	`related_research_id` text,
	`parent_message_id` text,
	`thread_depth` integer DEFAULT 0,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_conversations_conversation_id_unique` ON `agent_conversations` (`conversation_id`);--> statement-breakpoint
CREATE TABLE `agent_cycles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cycle_id` text NOT NULL,
	`project_id` text NOT NULL,
	`session_id` text,
	`task_id` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`outcome` text,
	`engineer_output` text,
	`verification_output` text,
	`review_output` text,
	`review_verdict` text,
	`start_sha` text,
	`end_sha` text,
	`duration_seconds` integer,
	`scope_drift_files` text DEFAULT '[]' NOT NULL,
	`hands_off_violations` text DEFAULT '[]' NOT NULL,
	`silent_failures` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_cycles_cycle_id_unique` ON `agent_cycles` (`cycle_id`);--> statement-breakpoint
CREATE TABLE `agent_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`feedback_id` text NOT NULL,
	`cycle_id` text NOT NULL,
	`project_id` text NOT NULL,
	`task_id` text NOT NULL,
	`original_output` text NOT NULL,
	`issue` text NOT NULL,
	`correction` text NOT NULL,
	`severity` text NOT NULL,
	`learned` integer DEFAULT false NOT NULL,
	`applied_to_cycles` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_feedback_feedback_id_unique` ON `agent_feedback` (`feedback_id`);--> statement-breakpoint
CREATE TABLE `agent_fleet_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`total_cycles` integer DEFAULT 0 NOT NULL,
	`total_verified` integer DEFAULT 0 NOT NULL,
	`total_failed` integer DEFAULT 0 NOT NULL,
	`accumulated_minutes` integer DEFAULT 0 NOT NULL,
	`last_cycle_at` integer,
	`last_cycle_outcome` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_fleet_state_project_id_unique` ON `agent_fleet_state` (`project_id`);--> statement-breakpoint
CREATE TABLE `agent_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` integer NOT NULL,
	`event` text NOT NULL,
	`cycle_id` text,
	`session_id` text,
	`project_id` text NOT NULL,
	`task_id` text,
	`data` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` text NOT NULL,
	`project_id` text NOT NULL,
	`session_id` text,
	`from` text NOT NULL,
	`kind` text DEFAULT 'fyi' NOT NULL,
	`body` text NOT NULL,
	`refs` text DEFAULT '[]' NOT NULL,
	`processed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_messages_message_id_unique` ON `agent_messages` (`message_id`);--> statement-breakpoint
CREATE TABLE `agent_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`mode` text DEFAULT 'A' NOT NULL,
	`priority` integer DEFAULT 2 NOT NULL,
	`engineer_command` text,
	`verification_command` text,
	`cycle_budget_minutes` integer DEFAULT 15 NOT NULL,
	`work_detection` text DEFAULT 'tasks_json' NOT NULL,
	`concurrency_detection` text DEFAULT 'none' NOT NULL,
	`branch` text DEFAULT 'bot/work' NOT NULL,
	`auto_merge` integer DEFAULT false NOT NULL,
	`hands_off` text DEFAULT '[]' NOT NULL,
	`provider_id` text DEFAULT 'openai' NOT NULL,
	`model` text DEFAULT 'gpt-4o' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_projects_project_id_unique` ON `agent_projects` (`project_id`);--> statement-breakpoint
CREATE TABLE `agent_providers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'openai' NOT NULL,
	`model` text NOT NULL,
	`api_key` text,
	`base_url` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_providers_provider_id_unique` ON `agent_providers` (`provider_id`);--> statement-breakpoint
CREATE TABLE `agent_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`project_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`stop_reason` text,
	`total_cycles` integer DEFAULT 0 NOT NULL,
	`total_verified` integer DEFAULT 0 NOT NULL,
	`total_failed` integer DEFAULT 0 NOT NULL,
	`duration_minutes` integer,
	`reviewer` text,
	`max_parallel_slots` integer,
	`parallel_rounds` integer,
	`slot_idle_seconds` integer,
	`parallel_efficiency` real,
	`started_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_sessions_session_id_unique` ON `agent_sessions` (`session_id`);--> statement-breakpoint
CREATE TABLE `agent_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` text NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` integer DEFAULT 2 NOT NULL,
	`interactive_only` integer DEFAULT false NOT NULL,
	`expected_touches` text DEFAULT '[]' NOT NULL,
	`description` text,
	`assigned_agent` text,
	`cycle_id` text,
	`result` text,
	`created_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_tasks_task_id_unique` ON `agent_tasks` (`task_id`);--> statement-breakpoint
CREATE TABLE `agent_workflows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`trigger_event` text NOT NULL,
	`participating_agents` text DEFAULT '[]' NOT NULL,
	`current_step` integer DEFAULT 0 NOT NULL,
	`total_steps` integer DEFAULT 0 NOT NULL,
	`step_data` text DEFAULT '{}' NOT NULL,
	`created_by` text DEFAULT 'system' NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_workflows_workflow_id_unique` ON `agent_workflows` (`workflow_id`);--> statement-breakpoint
CREATE TABLE `ai_agent_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_name` text NOT NULL,
	`agent_type` text DEFAULT 'general' NOT NULL,
	`listing_id` integer,
	`status` text DEFAULT 'queued' NOT NULL,
	`input` text,
	`output` text,
	`confidence` text,
	`message` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `appraisals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`item_name` text NOT NULL,
	`category` text NOT NULL,
	`condition` text,
	`description` text,
	`image_url` text,
	`estimated_value` text,
	`value_range_low` text,
	`value_range_high` text,
	`confidence` text DEFAULT 'medium',
	`market_analysis` text,
	`comparable_sales` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`commission_estimate` text,
	`commission_rate` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audit_id` text NOT NULL,
	`agent_name` text DEFAULT 'auditor',
	`check_type` text NOT NULL,
	`severity` text DEFAULT 'info' NOT NULL,
	`finding` text NOT NULL,
	`details` text DEFAULT '{}',
	`auto_fixed` integer DEFAULT false,
	`fix_applied` text,
	`fix_result` text,
	`requires_human_review` integer DEFAULT false,
	`checked_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_logs_audit_id_unique` ON `audit_logs` (`audit_id`);--> statement-breakpoint
CREATE TABLE `blockchain_certs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`user_id` integer,
	`certificate_hash` text NOT NULL,
	`contract_address` text,
	`token_id` text,
	`block_hash` text,
	`block_number` integer,
	`network` text DEFAULT 'ethereum_sepolia',
	`item_name` text NOT NULL,
	`item_description` text,
	`metadata_uri` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`certification_fee` text DEFAULT '0.002',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blockchain_certs_certificate_hash_unique` ON `blockchain_certs` (`certificate_hash`);--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`session_id` text,
	`listing_id` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`offer_price` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`icon` text,
	`description` text,
	`listing_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `coinbase_charges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`user_id` integer,
	`coinbase_charge_id` text NOT NULL,
	`coinbase_code` text,
	`coinbase_hosted_url` text,
	`amount` text NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coinbase_charges_coinbase_charge_id_unique` ON `coinbase_charges` (`coinbase_charge_id`);--> statement-breakpoint
CREATE TABLE `cold_email_prospects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prospect_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`niche` text NOT NULL,
	`company` text,
	`title` text,
	`website` text,
	`source` text DEFAULT 'manual',
	`status` text DEFAULT 'pending' NOT NULL,
	`sent_at` integer,
	`opened_at` integer,
	`replied_at` integer,
	`notes` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cold_email_prospects_prospect_id_unique` ON `cold_email_prospects` (`prospect_id`);--> statement-breakpoint
CREATE TABLE `cold_email_sends` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`send_id` text NOT NULL,
	`prospect_id` text NOT NULL,
	`template_id` text NOT NULL,
	`campaign_id` text,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`niche` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`gmail_message_id` text,
	`error_message` text,
	`sent_at` integer,
	`delivered_at` integer,
	`opened_at` integer,
	`replied_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cold_email_sends_send_id_unique` ON `cold_email_sends` (`send_id`);--> statement-breakpoint
CREATE TABLE `cold_email_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` text NOT NULL,
	`niche` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`created_by` text DEFAULT 'ai_agent',
	`status` text DEFAULT 'active' NOT NULL,
	`use_count` integer DEFAULT 0,
	`avg_response_rate` integer DEFAULT 0,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cold_email_templates_template_id_unique` ON `cold_email_templates` (`template_id`);--> statement-breakpoint
CREATE TABLE `commission_tiers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`min_amount` text NOT NULL,
	`max_amount` text,
	`rate` text NOT NULL,
	`label` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `crypto_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`user_id` integer,
	`buyer_address` text NOT NULL,
	`seller_address` text,
	`amount` text NOT NULL,
	`amount_usd` text NOT NULL,
	`currency` text DEFAULT 'ETH' NOT NULL,
	`network` text DEFAULT 'ethereum_sepolia',
	`tx_hash` text,
	`block_hash` text,
	`block_number` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`confirmations` integer DEFAULT 0,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crypto_payments_tx_hash_unique` ON `crypto_payments` (`tx_hash`);--> statement-breakpoint
CREATE TABLE `daily_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` text NOT NULL,
	`report_date` text NOT NULL,
	`status` text DEFAULT 'generated' NOT NULL,
	`sales_summary` text DEFAULT '{}',
	`agent_activity` text DEFAULT '{}',
	`outreach_summary` text DEFAULT '{}',
	`audit_findings` text DEFAULT '[]',
	`accounting_summary` text DEFAULT '{}',
	`security_checks` text DEFAULT '[]',
	`user_actions` text DEFAULT '[]',
	`alerts` text DEFAULT '[]',
	`full_report` text,
	`sent_at` integer,
	`read_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_reports_report_id_unique` ON `daily_reports` (`report_id`);--> statement-breakpoint
CREATE TABLE `email_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`recipient_email` text NOT NULL,
	`type` text NOT NULL,
	`subject` text NOT NULL,
	`body_html` text,
	`body_text` text,
	`metadata` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`sent_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expert_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`item_name` text NOT NULL,
	`category` text NOT NULL,
	`condition` text,
	`description` text,
	`provenance` text,
	`dimensions` text,
	`materials` text,
	`markings` text,
	`image_urls` text,
	`estimated_value` text,
	`status` text DEFAULT 'submitted' NOT NULL,
	`assigned_expert_ids` text,
	`review_fee` text DEFAULT '49.99',
	`priority` text DEFAULT 'standard',
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expert_consensus` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`consensus_authenticity` text NOT NULL,
	`consensus_value` text NOT NULL,
	`consensus_condition` text NOT NULL,
	`consensus_overall` text NOT NULL,
	`consensus_verdict` text DEFAULT 'uncertain',
	`estimated_value_low` text,
	`estimated_value_high` text,
	`expert_count` integer DEFAULT 0,
	`summary_report` text,
	`certificate_url` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expert_consensus_application_id_unique` ON `expert_consensus` (`application_id`);--> statement-breakpoint
CREATE TABLE `expert_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`title` text NOT NULL,
	`email` text,
	`institution` text,
	`location` text,
	`specialties` text,
	`credentials` text,
	`years_experience` integer DEFAULT 0,
	`review_count` integer DEFAULT 0,
	`rating` text DEFAULT '5.0',
	`avatar` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expert_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`expert_id` integer NOT NULL,
	`authenticity_score` integer NOT NULL,
	`value_score` integer NOT NULL,
	`condition_score` integer NOT NULL,
	`overall_score` text NOT NULL,
	`estimated_value` text,
	`value_range_low` text,
	`value_range_high` text,
	`authenticity_verdict` text DEFAULT 'uncertain',
	`condition_notes` text,
	`authenticity_notes` text,
	`value_notes` text,
	`methodology` text,
	`comparable_sales` text,
	`is_published` integer DEFAULT false,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inter_agent_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`check_id` text NOT NULL,
	`from_agent` text NOT NULL,
	`target_agent` text NOT NULL,
	`target_output` text,
	`check_type` text NOT NULL,
	`verdict` text DEFAULT 'pending' NOT NULL,
	`issues_found` text DEFAULT '[]',
	`correction_suggested` text,
	`was_corrected` integer DEFAULT false,
	`correction_applied` text,
	`reviewed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inter_agent_checks_check_id_unique` ON `inter_agent_checks` (`check_id`);--> statement-breakpoint
CREATE TABLE `internet_research` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`research_id` text NOT NULL,
	`listing_id` integer,
	`item_name` text NOT NULL,
	`category` text,
	`query` text NOT NULL,
	`platform` text NOT NULL,
	`source_url` text,
	`title` text,
	`content` text,
	`author` text,
	`author_url` text,
	`post_date` text,
	`relevance_score` integer DEFAULT 50,
	`confidence_score` integer DEFAULT 50,
	`ai_notes` text,
	`finding_type` text DEFAULT 'discussion',
	`is_buying_signal` integer DEFAULT false,
	`is_verified` integer DEFAULT false,
	`safety_flags` text DEFAULT '[]',
	`found_by_agent` text DEFAULT 'research',
	`found_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `internet_research_research_id_unique` ON `internet_research` (`research_id`);--> statement-breakpoint
CREATE TABLE `listing_fees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`listing_id` integer,
	`stripe_session_id` text,
	`amount` text DEFAULT '20.00' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`paid_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category_id` integer NOT NULL,
	`seller_id` integer,
	`price` text NOT NULL,
	`commission_rate` text DEFAULT '5.00' NOT NULL,
	`condition` text DEFAULT 'very_good',
	`status` text DEFAULT 'active' NOT NULL,
	`badge` text DEFAULT 'none',
	`images` text,
	`features` text,
	`appraisal_id` integer,
	`is_buy_now` integer DEFAULT true,
	`is_consignment` integer DEFAULT false,
	`view_count` integer DEFAULT 0 NOT NULL,
	`is_certified` integer DEFAULT false,
	`token_contract_address` text,
	`certification_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `marketing_analytics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`event_type` text NOT NULL,
	`page` text,
	`referrer` text,
	`user_agent` text,
	`ip_hash` text,
	`user_id` integer,
	`session_id` text,
	`metadata` text DEFAULT '{}',
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marketing_analytics_event_id_unique` ON `marketing_analytics` (`event_id`);--> statement-breakpoint
CREATE TABLE `newsletter_subscribers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`is_subscribed` integer DEFAULT true,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscribers_email_unique` ON `newsletter_subscribers` (`email`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`listing_id` integer NOT NULL,
	`listing_title` text NOT NULL,
	`listing_image` text,
	`amount` text NOT NULL,
	`commission` text DEFAULT '0.00',
	`payment_method` text DEFAULT 'other',
	`payment_status` text DEFAULT 'pending',
	`order_status` text DEFAULT 'pending',
	`shipping_address` text,
	`tracking_number` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outreach_campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer,
	`application_id` integer,
	`user_id` integer,
	`item_name` text NOT NULL,
	`category` text NOT NULL,
	`target_professionals` integer DEFAULT 5 NOT NULL,
	`found_leads` integer DEFAULT 0 NOT NULL,
	`outreach_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`ai_strategy` text,
	`last_run_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outreach_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` integer NOT NULL,
	`expert_id` integer,
	`professional_name` text,
	`professional_title` text,
	`institution` text,
	`email` text,
	`specialty` text,
	`outreach_method` text DEFAULT 'ai_search',
	`message` text,
	`response` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`confidence` integer DEFAULT 50,
	`attempt_number` integer DEFAULT 1,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `partnership_outreach` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`outreach_id` text NOT NULL,
	`company_name` text NOT NULL,
	`website` text,
	`industry` text NOT NULL,
	`contact_name` text,
	`contact_email` text,
	`contact_title` text,
	`outreach_method` text DEFAULT 'email' NOT NULL,
	`message_body` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`priority` integer DEFAULT 2 NOT NULL,
	`assigned_agent` text DEFAULT 'outreach' NOT NULL,
	`response_notes` text,
	`follow_up_date` integer,
	`created_at` integer NOT NULL,
	`sent_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partnership_outreach_outreach_id_unique` ON `partnership_outreach` (`outreach_id`);--> statement-breakpoint
CREATE TABLE `professional_leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` integer NOT NULL,
	`listing_id` integer,
	`application_id` integer,
	`user_id` integer,
	`outreach_log_id` integer,
	`expert_id` integer,
	`name` text NOT NULL,
	`title` text,
	`institution` text,
	`email` text,
	`specialty` text,
	`interest_level` text DEFAULT 'interested',
	`estimated_offer` text,
	`notes` text,
	`contact_message` text,
	`is_delivered` integer DEFAULT false,
	`delivered_at` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limit_counters` (
	`key` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer NOT NULL,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recently_viewed` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`session_id` text,
	`listing_id` integer NOT NULL,
	`viewed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`listing_id` integer,
	`item_name` text NOT NULL,
	`category` text,
	`status` text DEFAULT 'running' NOT NULL,
	`trigger_agent` text DEFAULT 'outreach',
	`participating_agents` text DEFAULT '[]',
	`total_findings` integer DEFAULT 0,
	`buying_signals` integer DEFAULT 0,
	`boundary_violations` integer DEFAULT 0,
	`summary_report` text,
	`started_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_sessions_session_id_unique` ON `research_sessions` (`session_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`user_id` integer,
	`user_name` text NOT NULL,
	`user_avatar` text,
	`rating` integer NOT NULL,
	`title` text,
	`comment` text,
	`is_verified_purchase` integer DEFAULT false,
	`helpful_count` integer DEFAULT 0,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `revoked_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sale_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`seller_id` integer NOT NULL,
	`buyer_id` integer,
	`buyer_email` text,
	`buyer_name` text,
	`sale_price` text NOT NULL,
	`commission_rate` text DEFAULT '5.00' NOT NULL,
	`commission_amount` text NOT NULL,
	`seller_payout` text NOT NULL,
	`stripe_payment_intent_id` text,
	`stripe_transfer_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`shipping_carrier` text,
	`shipping_tracking_number` text,
	`shipping_quote_id` integer,
	`shipped_at` integer,
	`delivered_at` integer,
	`completed_at` integer,
	`notes` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `security_hardening` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hardening_id` text NOT NULL,
	`agent_name` text DEFAULT 'security_auditor',
	`check_type` text NOT NULL,
	`finding` text NOT NULL,
	`recommendation` text,
	`severity` text DEFAULT 'info' NOT NULL,
	`was_implemented` integer DEFAULT false,
	`implementation_notes` text,
	`checked_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `security_hardening_hardening_id_unique` ON `security_hardening` (`hardening_id`);--> statement-breakpoint
CREATE TABLE `seller_payouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer NOT NULL,
	`sale_transaction_id` integer NOT NULL,
	`amount` text NOT NULL,
	`stripe_payout_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`method` text DEFAULT 'stripe_transfer',
	`paid_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shipping_quotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`seller_id` integer,
	`buyer_id` integer,
	`carrier` text NOT NULL,
	`service_level` text,
	`estimated_cost` text,
	`estimated_days` integer,
	`origin_zip` text,
	`destination_zip` text,
	`package_weight` text,
	`package_dimensions` text,
	`insurance_amount` text,
	`is_insured` integer DEFAULT false,
	`quote_data` text,
	`expires_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `social_media_mentions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`search_id` integer NOT NULL,
	`listing_id` integer NOT NULL,
	`platform` text NOT NULL,
	`post_url` text,
	`post_content` text,
	`author_username` text,
	`author_display_name` text,
	`author_profile_url` text,
	`author_bio` text,
	`public_email` text,
	`public_website` text,
	`public_location` text,
	`followers_count` integer,
	`post_date` integer,
	`engagement_score` integer DEFAULT 0,
	`relevance_score` integer DEFAULT 50,
	`ai_notes` text,
	`is_contacted` integer DEFAULT false,
	`contact_method` text,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `social_media_searches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`user_id` integer,
	`item_name` text NOT NULL,
	`category` text NOT NULL,
	`platforms_searched` text,
	`search_query` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`total_mentions_found` integer DEFAULT 0,
	`leads_with_contact` integer DEFAULT 0,
	`ai_summary` text,
	`completed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stripe_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`user_id` integer,
	`listing_id` integer NOT NULL,
	`amount` text NOT NULL,
	`commission` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stripe_sessions_session_id_unique` ON `stripe_sessions` (`session_id`);--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `system_settings_key_unique` ON `system_settings` (`key`);--> statement-breakpoint
CREATE TABLE `user_session_revocations` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`revoked_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_workflows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` text NOT NULL,
	`user_email` text,
	`user_id` integer,
	`trigger_type` text NOT NULL,
	`item_name` text,
	`current_step` integer DEFAULT 1,
	`total_steps` integer DEFAULT 5,
	`step_data` text DEFAULT '{}',
	`email_sent` integer DEFAULT false,
	`email_opened` integer DEFAULT false,
	`user_prompted_agent` integer DEFAULT false,
	`user_prompt_text` text,
	`agent_response` text,
	`status` text DEFAULT 'active' NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_workflows_workflow_id_unique` ON `user_workflows` (`workflow_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`unionId` text,
	`oauth_provider` text,
	`oauth_provider_id` text,
	`name` text,
	`email` text,
	`avatar` text,
	`password` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`lastSignInAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_unionId_unique` ON `users` (`unionId`);--> statement-breakpoint
CREATE TABLE `wishlist_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`listing_id` integer NOT NULL,
	`session_id` text,
	`created_at` integer NOT NULL
);
