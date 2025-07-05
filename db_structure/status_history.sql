USE [db_1]
GO

/****** Object:  Table [dbo].[status_history]    Script Date: 02/07/2025 21:14:35 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[status_history](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[u_id] [int] NOT NULL,
	[status] [varchar](255) NOT NULL,
	[changed_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[status_history] ADD  DEFAULT (getdate()) FOR [changed_at]
GO

ALTER TABLE [dbo].[status_history]  WITH CHECK ADD FOREIGN KEY([u_id])
REFERENCES [dbo].[candidate_card] ([u_id])
ON DELETE CASCADE
GO

