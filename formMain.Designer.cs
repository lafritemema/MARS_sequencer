namespace RailsSplicing
{
    partial class formMain
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.b_loadData = new System.Windows.Forms.Button();
            this.b_startCycle = new System.Windows.Forms.Button();
            this.groupBox1 = new System.Windows.Forms.GroupBox();
            this.tb_hole = new System.Windows.Forms.TextBox();
            this.label4 = new System.Windows.Forms.Label();
            this.l_CountHole = new System.Windows.Forms.Label();
            this.tb_Piercing = new System.Windows.Forms.TextBox();
            this.pb_Piercing = new System.Windows.Forms.ProgressBar();
            this.tb_Action = new System.Windows.Forms.TextBox();
            this.l_processStation = new System.Windows.Forms.Label();
            this.l_Action = new System.Windows.Forms.Label();
            this.tb_processStation = new System.Windows.Forms.TextBox();
            this.label3 = new System.Windows.Forms.Label();
            this.groupBox3 = new System.Windows.Forms.GroupBox();
            this.groupBox2 = new System.Windows.Forms.GroupBox();
            this.l_Step4 = new System.Windows.Forms.Label();
            this.l_Step1 = new System.Windows.Forms.Label();
            this.l_Step3 = new System.Windows.Forms.Label();
            this.l_Step2 = new System.Windows.Forms.Label();
            this.b_tool = new System.Windows.Forms.Button();
            this.b_C = new System.Windows.Forms.Button();
            this.tb_setup = new System.Windows.Forms.TextBox();
            this.label1 = new System.Windows.Forms.Label();
            this.lb_Finish = new System.Windows.Forms.Label();
            this.lb_Current = new System.Windows.Forms.Label();
            this.lb_Next = new System.Windows.Forms.Label();
            this.groupBox1.SuspendLayout();
            this.groupBox3.SuspendLayout();
            this.groupBox2.SuspendLayout();
            this.SuspendLayout();
            // 
            // b_loadData
            // 
            this.b_loadData.Location = new System.Drawing.Point(39, 37);
            this.b_loadData.Name = "b_loadData";
            this.b_loadData.Size = new System.Drawing.Size(86, 31);
            this.b_loadData.TabIndex = 0;
            this.b_loadData.Text = "Load data";
            this.b_loadData.UseVisualStyleBackColor = true;
            this.b_loadData.Click += new System.EventHandler(this.b_loadData_Click);
            // 
            // b_startCycle
            // 
            this.b_startCycle.Location = new System.Drawing.Point(162, 37);
            this.b_startCycle.Name = "b_startCycle";
            this.b_startCycle.Size = new System.Drawing.Size(86, 31);
            this.b_startCycle.TabIndex = 1;
            this.b_startCycle.Text = "Start cycle";
            this.b_startCycle.UseVisualStyleBackColor = true;
            this.b_startCycle.Click += new System.EventHandler(this.b_startCycle_Click);
            // 
            // groupBox1
            // 
            this.groupBox1.BackColor = System.Drawing.SystemColors.Control;
            this.groupBox1.Controls.Add(this.tb_hole);
            this.groupBox1.Controls.Add(this.label4);
            this.groupBox1.Controls.Add(this.l_CountHole);
            this.groupBox1.Controls.Add(this.tb_Piercing);
            this.groupBox1.Controls.Add(this.pb_Piercing);
            this.groupBox1.Controls.Add(this.tb_Action);
            this.groupBox1.Controls.Add(this.l_processStation);
            this.groupBox1.Controls.Add(this.l_Action);
            this.groupBox1.Controls.Add(this.tb_processStation);
            this.groupBox1.Controls.Add(this.label3);
            this.groupBox1.Location = new System.Drawing.Point(307, 12);
            this.groupBox1.Margin = new System.Windows.Forms.Padding(0);
            this.groupBox1.Name = "groupBox1";
            this.groupBox1.Size = new System.Drawing.Size(283, 400);
            this.groupBox1.TabIndex = 3;
            this.groupBox1.TabStop = false;
            this.groupBox1.Text = "Working Progress";
            // 
            // tb_hole
            // 
            this.tb_hole.Location = new System.Drawing.Point(210, 48);
            this.tb_hole.Name = "tb_hole";
            this.tb_hole.Size = new System.Drawing.Size(54, 20);
            this.tb_hole.TabIndex = 14;
            // 
            // label4
            // 
            this.label4.AutoSize = true;
            this.label4.Location = new System.Drawing.Point(17, 208);
            this.label4.Name = "label4";
            this.label4.Size = new System.Drawing.Size(90, 13);
            this.label4.TabIndex = 13;
            this.label4.Text = "Drilling Monitoring";
            // 
            // l_CountHole
            // 
            this.l_CountHole.AutoSize = true;
            this.l_CountHole.Location = new System.Drawing.Point(17, 135);
            this.l_CountHole.Name = "l_CountHole";
            this.l_CountHole.Size = new System.Drawing.Size(30, 13);
            this.l_CountHole.TabIndex = 12;
            this.l_CountHole.Text = "0 / 0";
            // 
            // tb_Piercing
            // 
            this.tb_Piercing.Location = new System.Drawing.Point(20, 224);
            this.tb_Piercing.Multiline = true;
            this.tb_Piercing.Name = "tb_Piercing";
            this.tb_Piercing.ScrollBars = System.Windows.Forms.ScrollBars.Vertical;
            this.tb_Piercing.Size = new System.Drawing.Size(244, 170);
            this.tb_Piercing.TabIndex = 11;
            // 
            // pb_Piercing
            // 
            this.pb_Piercing.Location = new System.Drawing.Point(20, 151);
            this.pb_Piercing.Name = "pb_Piercing";
            this.pb_Piercing.Size = new System.Drawing.Size(244, 23);
            this.pb_Piercing.Step = 1;
            this.pb_Piercing.TabIndex = 10;
            // 
            // tb_Action
            // 
            this.tb_Action.Location = new System.Drawing.Point(20, 99);
            this.tb_Action.Name = "tb_Action";
            this.tb_Action.Size = new System.Drawing.Size(244, 20);
            this.tb_Action.TabIndex = 9;
            // 
            // l_processStation
            // 
            this.l_processStation.AutoSize = true;
            this.l_processStation.Location = new System.Drawing.Point(17, 32);
            this.l_processStation.Name = "l_processStation";
            this.l_processStation.Size = new System.Drawing.Size(40, 13);
            this.l_processStation.TabIndex = 0;
            this.l_processStation.Text = "Station";
            // 
            // l_Action
            // 
            this.l_Action.AutoSize = true;
            this.l_Action.Location = new System.Drawing.Point(17, 83);
            this.l_Action.Name = "l_Action";
            this.l_Action.Size = new System.Drawing.Size(37, 13);
            this.l_Action.TabIndex = 8;
            this.l_Action.Text = "Action";
            // 
            // tb_processStation
            // 
            this.tb_processStation.Location = new System.Drawing.Point(20, 48);
            this.tb_processStation.Name = "tb_processStation";
            this.tb_processStation.Size = new System.Drawing.Size(173, 20);
            this.tb_processStation.TabIndex = 1;
            // 
            // label3
            // 
            this.label3.AutoSize = true;
            this.label3.Location = new System.Drawing.Point(207, 32);
            this.label3.Name = "label3";
            this.label3.Size = new System.Drawing.Size(34, 13);
            this.label3.TabIndex = 6;
            this.label3.Text = "Holes";
            // 
            // groupBox3
            // 
            this.groupBox3.Controls.Add(this.groupBox2);
            this.groupBox3.Controls.Add(this.b_tool);
            this.groupBox3.Controls.Add(this.b_C);
            this.groupBox3.Controls.Add(this.tb_setup);
            this.groupBox3.Controls.Add(this.b_loadData);
            this.groupBox3.Controls.Add(this.label1);
            this.groupBox3.Controls.Add(this.b_startCycle);
            this.groupBox3.Location = new System.Drawing.Point(12, 12);
            this.groupBox3.Name = "groupBox3";
            this.groupBox3.Size = new System.Drawing.Size(283, 400);
            this.groupBox3.TabIndex = 7;
            this.groupBox3.TabStop = false;
            this.groupBox3.Text = "Process";
            // 
            // groupBox2
            // 
            this.groupBox2.Controls.Add(this.lb_Next);
            this.groupBox2.Controls.Add(this.lb_Current);
            this.groupBox2.Controls.Add(this.lb_Finish);
            this.groupBox2.Controls.Add(this.l_Step4);
            this.groupBox2.Controls.Add(this.l_Step1);
            this.groupBox2.Controls.Add(this.l_Step3);
            this.groupBox2.Controls.Add(this.l_Step2);
            this.groupBox2.Location = new System.Drawing.Point(6, 208);
            this.groupBox2.Name = "groupBox2";
            this.groupBox2.Size = new System.Drawing.Size(271, 186);
            this.groupBox2.TabIndex = 20;
            this.groupBox2.TabStop = false;
            this.groupBox2.Text = "Step Monitoring";
            // 
            // l_Step4
            // 
            this.l_Step4.AutoSize = true;
            this.l_Step4.Location = new System.Drawing.Point(8, 140);
            this.l_Step4.Name = "l_Step4";
            this.l_Step4.Size = new System.Drawing.Size(0, 13);
            this.l_Step4.TabIndex = 19;
            // 
            // l_Step1
            // 
            this.l_Step1.AutoSize = true;
            this.l_Step1.ForeColor = System.Drawing.Color.Green;
            this.l_Step1.Location = new System.Drawing.Point(8, 30);
            this.l_Step1.Name = "l_Step1";
            this.l_Step1.Size = new System.Drawing.Size(0, 13);
            this.l_Step1.TabIndex = 16;
            // 
            // l_Step3
            // 
            this.l_Step3.AutoSize = true;
            this.l_Step3.ForeColor = System.Drawing.SystemColors.ControlText;
            this.l_Step3.Location = new System.Drawing.Point(8, 102);
            this.l_Step3.Name = "l_Step3";
            this.l_Step3.Size = new System.Drawing.Size(0, 13);
            this.l_Step3.TabIndex = 18;
            // 
            // l_Step2
            // 
            this.l_Step2.AutoSize = true;
            this.l_Step2.ForeColor = System.Drawing.Color.DarkOrange;
            this.l_Step2.Location = new System.Drawing.Point(8, 66);
            this.l_Step2.Name = "l_Step2";
            this.l_Step2.Size = new System.Drawing.Size(0, 13);
            this.l_Step2.TabIndex = 17;
            // 
            // b_tool
            // 
            this.b_tool.Location = new System.Drawing.Point(162, 141);
            this.b_tool.Name = "b_tool";
            this.b_tool.Size = new System.Drawing.Size(86, 31);
            this.b_tool.TabIndex = 5;
            this.b_tool.Text = "Tool fitted";
            this.b_tool.UseVisualStyleBackColor = true;
            this.b_tool.Click += new System.EventHandler(this.b_tool_Click);
            // 
            // b_C
            // 
            this.b_C.Location = new System.Drawing.Point(39, 141);
            this.b_C.Name = "b_C";
            this.b_C.Size = new System.Drawing.Size(86, 31);
            this.b_C.TabIndex = 4;
            this.b_C.Text = "C fitted";
            this.b_C.UseVisualStyleBackColor = true;
            this.b_C.Click += new System.EventHandler(this.b_C_Click);
            // 
            // tb_setup
            // 
            this.tb_setup.Font = new System.Drawing.Font("Microsoft Sans Serif", 12F, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.tb_setup.Location = new System.Drawing.Point(6, 109);
            this.tb_setup.Name = "tb_setup";
            this.tb_setup.ScrollBars = System.Windows.Forms.ScrollBars.Vertical;
            this.tb_setup.Size = new System.Drawing.Size(271, 26);
            this.tb_setup.TabIndex = 2;
            this.tb_setup.TextAlign = System.Windows.Forms.HorizontalAlignment.Center;
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Font = new System.Drawing.Font("Microsoft Sans Serif", 9F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.label1.Location = new System.Drawing.Point(88, 91);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(106, 15);
            this.label1.TabIndex = 3;
            this.label1.Text = "Operator Action";
            // 
            // lb_Finish
            // 
            this.lb_Finish.AutoSize = true;
            this.lb_Finish.ForeColor = System.Drawing.Color.Green;
            this.lb_Finish.Location = new System.Drawing.Point(8, 170);
            this.lb_Finish.Name = "lb_Finish";
            this.lb_Finish.Size = new System.Drawing.Size(66, 13);
            this.lb_Finish.TabIndex = 20;
            this.lb_Finish.Text = "* Finish Step";
            this.lb_Finish.Visible = false;
            // 
            // lb_Current
            // 
            this.lb_Current.AutoSize = true;
            this.lb_Current.ForeColor = System.Drawing.Color.DarkOrange;
            this.lb_Current.Location = new System.Drawing.Point(108, 170);
            this.lb_Current.Name = "lb_Current";
            this.lb_Current.Size = new System.Drawing.Size(73, 13);
            this.lb_Current.TabIndex = 21;
            this.lb_Current.Text = "* Current Step";
            this.lb_Current.Visible = false;
            // 
            // lb_Next
            // 
            this.lb_Next.AutoSize = true;
            this.lb_Next.ForeColor = System.Drawing.SystemColors.ControlText;
            this.lb_Next.Location = new System.Drawing.Point(210, 170);
            this.lb_Next.Name = "lb_Next";
            this.lb_Next.Size = new System.Drawing.Size(61, 13);
            this.lb_Next.TabIndex = 22;
            this.lb_Next.Text = "* Next Step";
            this.lb_Next.Visible = false;
            // 
            // formMain
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(599, 423);
            this.Controls.Add(this.groupBox3);
            this.Controls.Add(this.groupBox1);
            this.Name = "formMain";
            this.Text = "Rails Splicing";
            this.groupBox1.ResumeLayout(false);
            this.groupBox1.PerformLayout();
            this.groupBox3.ResumeLayout(false);
            this.groupBox3.PerformLayout();
            this.groupBox2.ResumeLayout(false);
            this.groupBox2.PerformLayout();
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.Button b_loadData;
        private System.Windows.Forms.Button b_startCycle;
        private System.Windows.Forms.GroupBox groupBox1;
        private System.Windows.Forms.Label l_processStation;
        private System.Windows.Forms.TextBox tb_processStation;
        private System.Windows.Forms.GroupBox groupBox3;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.TextBox tb_setup;
        private System.Windows.Forms.Button b_tool;
        private System.Windows.Forms.Button b_C;
        private System.Windows.Forms.Label label3;
        private System.Windows.Forms.TextBox tb_Action;
        private System.Windows.Forms.Label l_Action;
        private System.Windows.Forms.ProgressBar pb_Piercing;
        private System.Windows.Forms.TextBox tb_Piercing;
        private System.Windows.Forms.Label l_CountHole;
        private System.Windows.Forms.Label label4;
        private System.Windows.Forms.Label l_Step4;
        private System.Windows.Forms.Label l_Step3;
        private System.Windows.Forms.Label l_Step2;
        private System.Windows.Forms.Label l_Step1;
        private System.Windows.Forms.TextBox tb_hole;
        private System.Windows.Forms.GroupBox groupBox2;
        private System.Windows.Forms.Label lb_Next;
        private System.Windows.Forms.Label lb_Current;
        private System.Windows.Forms.Label lb_Finish;
    }
}