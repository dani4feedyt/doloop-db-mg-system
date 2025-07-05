USE [db_1]
GO

/****** Object:  Table [dbo].[selection_card]    Script Date: 02/07/2025 21:14:22 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[selection_card](
	[pos_id] [int] NOT NULL,
	[is_replacement] [bit] NOT NULL,
	[selection_status] [varchar](max) NOT NULL,
	[interview_date] [date] NULL,
	[interview_handler] [varchar](max) NULL,
	[source] [varchar](max) NULL,
	[comments] [varchar](max) NULL,
	[job_offer] [bit] NULL,
	[candidate_decision] [bit] NULL,
	[refusal_reason] [varchar](max) NULL,
	[work_start_date] [date] NULL,
	[u_id] [int] NOT NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[selection_card] ADD  DEFAULT ((0)) FOR [is_replacement]
GO

ALTER TABLE [dbo].[selection_card] ADD  DEFAULT ('Not started') FOR [selection_status]
GO

ALTER TABLE [dbo].[selection_card]  WITH CHECK ADD FOREIGN KEY([u_id])
REFERENCES [dbo].[candidate_card] ([u_id])
GO

ALTER TABLE [dbo].[selection_card]  WITH CHECK ADD FOREIGN KEY([pos_id])
REFERENCES [dbo].[s_positions] ([pos_id])
GO

