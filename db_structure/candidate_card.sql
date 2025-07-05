USE [db_1]
GO

/****** Object:  Table [dbo].[candidate_card]    Script Date: 02/07/2025 21:13:59 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[candidate_card](
	[u_id] [int] NOT NULL,
	[name] [varchar](max) NULL,
	[surname] [varchar](max) NULL,
	[e-mail] [varchar](max) NULL,
	[phone_number] [varchar](max) NULL,
	[location] [varchar](max) NULL,
	[age] [int] NULL,
	[gender] [varchar](max) NULL,
	[cv] [varbinary](max) NULL,
	[linkedin] [varchar](max) NULL,
	[employment status] [bit] NULL,
	[salary expectations] [varchar](max) NULL,
	[future_contact] [bit] NULL,
	[contact_date] [date] NULL,
	[comments] [varchar](max) NULL,
	[experience_summary] [varchar](max) NULL,
	[created_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[u_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[candidate_card] ADD  DEFAULT ((0)) FOR [employment status]
GO

ALTER TABLE [dbo].[candidate_card] ADD  DEFAULT ((0)) FOR [future_contact]
GO

ALTER TABLE [dbo].[candidate_card] ADD  DEFAULT (getdate()) FOR [created_at]
GO

