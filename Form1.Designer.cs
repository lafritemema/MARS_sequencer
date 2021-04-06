namespace RailsSplicing
{
    partial class Form1
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
            this.Process = new System.Windows.Forms.GroupBox();
            this.b_CMIP = new System.Windows.Forms.Button();
            this.b_TMIP = new System.Windows.Forms.Button();
            this.textBox1 = new System.Windows.Forms.TextBox();
            this.b_loadData = new System.Windows.Forms.Button();
            this.b_startProcess = new System.Windows.Forms.Button();
            this.Process.SuspendLayout();
            this.SuspendLayout();
            // 
            // Process
            // 
            this.Process.BackColor = System.Drawing.Color.LightGray;
            this.Process.Controls.Add(this.b_startProcess);
            this.Process.Controls.Add(this.b_loadData);
            this.Process.Controls.Add(this.textBox1);
            this.Process.Controls.Add(this.b_TMIP);
            this.Process.Controls.Add(this.b_CMIP);
            this.Process.ForeColor = System.Drawing.Color.Black;
            this.Process.Location = new System.Drawing.Point(12, 12);
            this.Process.Name = "Process";
            this.Process.Size = new System.Drawing.Size(400, 426);
            this.Process.TabIndex = 0;
            this.Process.TabStop = false;
            this.Process.Text = "Process";
            // 
            // b_CMIP
            // 
            this.b_CMIP.Location = new System.Drawing.Point(65, 82);
            this.b_CMIP.Name = "b_CMIP";
            this.b_CMIP.Size = new System.Drawing.Size(112, 42);
            this.b_CMIP.TabIndex = 0;
            this.b_CMIP.Text = "C en place";
            this.b_CMIP.UseVisualStyleBackColor = true;
            // 
            // b_TMIP
            // 
            this.b_TMIP.AutoEllipsis = true;
            this.b_TMIP.Location = new System.Drawing.Point(223, 82);
            this.b_TMIP.Name = "b_TMIP";
            this.b_TMIP.Size = new System.Drawing.Size(112, 42);
            this.b_TMIP.TabIndex = 1;
            this.b_TMIP.Text = "Outil en Place";
            this.b_TMIP.UseVisualStyleBackColor = true;
            // 
            // textBox1
            // 
            this.textBox1.Location = new System.Drawing.Point(65, 29);
            this.textBox1.Multiline = true;
            this.textBox1.Name = "textBox1";
            this.textBox1.Size = new System.Drawing.Size(270, 47);
            this.textBox1.TabIndex = 2;
            // 
            // b_loadData
            // 
            this.b_loadData.Location = new System.Drawing.Point(65, 130);
            this.b_loadData.Name = "b_loadData";
            this.b_loadData.Size = new System.Drawing.Size(270, 42);
            this.b_loadData.TabIndex = 3;
            this.b_loadData.Text = "Load Data";
            this.b_loadData.UseVisualStyleBackColor = true;
            // 
            // b_startProcess
            // 
            this.b_startProcess.Location = new System.Drawing.Point(65, 178);
            this.b_startProcess.Name = "b_startProcess";
            this.b_startProcess.Size = new System.Drawing.Size(270, 42);
            this.b_startProcess.TabIndex = 4;
            this.b_startProcess.Text = "Start";
            this.b_startProcess.UseVisualStyleBackColor = true;
            // 
            // Form1
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(800, 450);
            this.Controls.Add(this.Process);
            this.ForeColor = System.Drawing.SystemColors.ControlText;
            this.Name = "Form1";
            this.Text = "IHM";
            this.Process.ResumeLayout(false);
            this.Process.PerformLayout();
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.GroupBox Process;
        private System.Windows.Forms.Button b_startProcess;
        private System.Windows.Forms.Button b_loadData;
        private System.Windows.Forms.TextBox textBox1;
        private System.Windows.Forms.Button b_TMIP;
        private System.Windows.Forms.Button b_CMIP;
    }
}