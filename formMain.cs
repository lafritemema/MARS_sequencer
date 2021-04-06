using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Threading;
using System.Windows.Forms;
using System.Xml.Serialization;
using System.IO;
using Sres.Net.EEIP;
using System.Collections;
using System.Xml;
using System.Security.Cryptography.X509Certificates;
using System.Drawing.Text;
using System.Diagnostics;
using System.Runtime.CompilerServices;

namespace RailsSplicing
{
    public partial class formMain : Form
    {
        //Declarations
        static EEIPClient eeipClient = new EEIPClient();
        private Process data = null;
        private bool C; //= True si le C est placé
        private bool Tool; //= True si l'outil est placé
        
        //Variables pour affichage IHM
        private string Ctype; //Type du C : Flange ou Web (Depuis Xml)
        private string ToolDiam; //Diamètre de l'outil (Depuis Xml)
        private string txt_station; //Texte qui stock le num de la station en cours (Depuis Xml)
        private string txt_step; //Texte qui stock le num du step en cours (Depuis Xml)
        private string txt_rail; //Texte qui stock le num du rail (Depuis Xml)
        private string txt_position; //Texte qui stock la position sur le rail (Depuis Xml)
        private string txt_side; //Texte qui stock le coté du rail sur lequel on agit (Depuis Xml)
        private int hole; //Compteur de trous
        private int HoleProgress; //Pourcentage des trous percés
        private int numHoles; //Stock le nombre de trous à percer/Station (Depuis Xml)
        
        //Background Workers
        private BackgroundWorker bgw_loadData; //Gère le chargement des données
        private BackgroundWorker bgw_sequencer; //Gère le déroulé du sequenceur -> l'envoie des data au controleur Robot
        private BackgroundWorker bgw_robotStatus; //Gère les informations sur le positionnementnt du robot et les informations sur les actions en cours
        private List<String> logs = new List<String>();
        /*****************************************************************************
                               Ecriture et lecture de registres
                -> tout est dans le doc "Fanuc Ethernet/IP Operator's manual"
        *****************************************************************************/

        //Lecture Registre Robot
        static Int32 read_register(int register)
        {
            return BitConverter.ToInt32(eeipClient.GetAttributeSingle(0x6B, 0x01, register), 0);
        }

        //Ecriture Registre Robot
        static void write_register(int register, Int32 value)
        {
            eeipClient.SetAttributeSingle(0x6B, 0x01, register, BitConverter.GetBytes(value));

        }

        //Ecriture Registre Position Robot
        //Mode Cartésien
        static void write_position_register(int register, float UT, float UF, Single X, Single Y, Single Z, Single W, Single P, Single R, Single E1, float turn4, float turn5, float turn6, bool front, bool up, bool left, bool flip)
        {
            byte[] PR = new byte[44];
            BitConverter.GetBytes(UT).CopyTo(PR, 0);
            BitConverter.GetBytes(UF).CopyTo(PR, 1);
            BitConverter.GetBytes(X).CopyTo(PR, 4);
            BitConverter.GetBytes(Y).CopyTo(PR, 8);
            BitConverter.GetBytes(Z).CopyTo(PR, 12);
            BitConverter.GetBytes(W).CopyTo(PR, 16);
            BitConverter.GetBytes(P).CopyTo(PR, 20);
            BitConverter.GetBytes(R).CopyTo(PR, 24);
            BitConverter.GetBytes(turn4).CopyTo(PR, 28);
            BitConverter.GetBytes(turn5).CopyTo(PR, 29);
            BitConverter.GetBytes(turn6).CopyTo(PR, 30);
            var bits = new BitArray(new bool[] { false, false, false, false, front, up, left, flip });
            bits.CopyTo(PR, 31);
            BitConverter.GetBytes(E1).CopyTo(PR, 32);
            eeipClient.SetAttributeSingle(0x7B, 0x01, register, PR);
        }

        //Mode Joint
        static void write_position_register_Joint(int register, float UT, float UF, Single X, Single Y, Single Z, Single W, Single P, Single R, Single E1)
        {
            byte[] PR = new byte[40];
            BitConverter.GetBytes(UT).CopyTo(PR, 0);
            BitConverter.GetBytes(UF).CopyTo(PR, 1);
            BitConverter.GetBytes(X).CopyTo(PR, 4);         //J1
            BitConverter.GetBytes(Y).CopyTo(PR, 8);         //J2 
            BitConverter.GetBytes(Z).CopyTo(PR, 12);        //J3
            BitConverter.GetBytes(W).CopyTo(PR, 16);        //J4
            BitConverter.GetBytes(P).CopyTo(PR, 20);        //J5
            BitConverter.GetBytes(R).CopyTo(PR, 24);        //J6
            BitConverter.GetBytes(E1).CopyTo(PR, 28);
            eeipClient.SetAttributeSingle(0x7C, 0x01, register, PR);

        }

         /*****************************************************************************
                                     XML Data serialization
                             Récupération des données du BuildProcess
                         Ecriture des attributs dans les classes associées
        *****************************************************************************/

        [XmlRoot(ElementName = "process")]
        public class Process
        {
            [XmlElement("Step")]
            public List<Step> step { get; set; }
        }
        [XmlRoot(ElementName = "Step")]

        public class Step
        {
            [XmlAttribute]
            public Int32 id { get; set; }
            [XmlAttribute]
            public String C { get; set; }
            [XmlAttribute]
            public String Tool { get; set; }
            [XmlElement("Station")]
            public List<Station> stations { get; set; }

        }
        [XmlRoot(ElementName = "Station")]

        public class Station
        {
            [XmlAttribute]
            public Int32 id { get; set; }
            [XmlAttribute]
            public Int32 Points { get; set; }
            [XmlAttribute]
            public String Side { get; set; }
            [XmlAttribute]
            public String Position { get; set; }
            [XmlAttribute]
            public Int32 Rail { get; set; }
            [XmlElement("Phase")]
            public List<Phase> phase { get; set; }
        }
        [XmlRoot(ElementName = "Phase")]

        public class Phase
        {
            [XmlAttribute]
            public Int32 id { get; set; }
            [XmlAttribute]
            public String Info { get; set; }
            [XmlAttribute]
            public String Mode { get; set; }
            [XmlAttribute]
            public String FastName { get; set; }
            [XmlElement("Point")]
            public List<Point> points { get; set; }
        }
        [XmlRoot(ElementName = "Point")]

        public class Point
        {
            [XmlAttribute]
            public Int32 id { get; set; }
            [XmlAttribute]
            public Single UT { get; set; }
            [XmlAttribute]
            public Single UF { get; set; }
            [XmlAttribute]
            public Single X { get; set; }
            [XmlAttribute]
            public Single Y { get; set; }
            [XmlAttribute]
            public Single Z { get; set; }
            [XmlAttribute]
            public Single W { get; set; }
            [XmlAttribute]
            public Single P { get; set; }
            [XmlAttribute]
            public Single R { get; set; }
            [XmlAttribute]
            public Single E1 { get; set; }
            [XmlAttribute]
            public float t4 { get; set; }
            [XmlAttribute]
            public float t5 { get; set; }
            [XmlAttribute]
            public float t6 { get; set; }
            [XmlAttribute]
            public bool front { get; set; }
            [XmlAttribute]
            public bool up { get; set; }
            [XmlAttribute]
            public bool left { get; set; }
            [XmlAttribute]
            public bool flip { get; set; }
            [XmlAttribute]
            public String type { get; set; }
            [XmlAttribute]
            public Int32 speed { get; set; }
            [XmlAttribute]
            public String approx { get; set; }
            [XmlAttribute]
            public Int32 cnt { get; set; }
        }

        /*****************************************************************************
                            Statut du Robot pour le fichier Logs
       *****************************************************************************/
        public class Progress
        {
            public String statut { get; set; }
        }

        public formMain()
        {
            InitializeComponent();
            b_startCycle.Enabled = false; //Boutons désactivés de base, ils s'activeront dès que cela sera nécessaire, en fonction de l'action qu'a à effectuer l'opérateur
            b_C.Enabled = false;
            b_tool.Enabled = false;
            eeipClient.RegisterSession("127.0.0.1"); //Connection au PC local pour le protocole Ethernet/IP

            //Background worker for loading data
            this.bgw_loadData = new BackgroundWorker();
            this.bgw_loadData.DoWork += new DoWorkEventHandler(bgw_loadData_DoWork);
            this.bgw_loadData.ProgressChanged += new ProgressChangedEventHandler(bgw_loadData_ProgressChanged);
            this.bgw_loadData.RunWorkerCompleted += new RunWorkerCompletedEventHandler(bgw_loadData_RunWorkerCompleted);
            this.bgw_loadData.WorkerReportsProgress = true;

            //Background worker for sequencer
            this.bgw_sequencer = new BackgroundWorker();
            this.bgw_sequencer.DoWork += new DoWorkEventHandler(bgw_sequencer_DoWork);
            this.bgw_sequencer.ProgressChanged += new ProgressChangedEventHandler(bgw_sequencer_ProgressChanged);
            this.bgw_sequencer.RunWorkerCompleted += new RunWorkerCompletedEventHandler(bgw_sequencer_RunWorkerCompleted);
            this.bgw_sequencer.WorkerReportsProgress = true;

            //Background worker for robot status
            this.bgw_robotStatus = new BackgroundWorker();
            this.bgw_robotStatus.DoWork += new DoWorkEventHandler(bgw_robotStatus_DoWork);
            this.bgw_robotStatus.ProgressChanged += new ProgressChangedEventHandler(bgw_robotStatus_ProgressChanged);
            this.bgw_robotStatus.WorkerReportsProgress = true;
            this.bgw_robotStatus.RunWorkerAsync(2000);
        }

        /*****************************************************************************
                                Objects Windows Form pour IHM
       *****************************************************************************/
        // Detecte le Click user sur le bouton "LoadData" -> Lance la fonction "loadData_DoWork"
        private void b_loadData_Click(object sender, EventArgs e)
        {
            bgw_loadData.RunWorkerAsync(2000);
        }

        //Detecte le Click user sur le bouton "Start Cycle" + désactive après le click -> Lance la fonction "sequencer_DoWork"
        private void b_startCycle_Click(object sender, EventArgs e)
        {
            bgw_sequencer.RunWorkerAsync(2000);
            b_startCycle.Enabled = false;
        }

        //Detecte le Click user sur le bouton "C" + désactive après le click -> Le C est en place
        private void b_C_Click(object sender, EventArgs e)
        {
            C = true;
            b_C.Enabled = false;
        }

        //Detecte le Click user sur le bouton "Tool" + désactive après le click -> L'outil est en place
        private void b_tool_Click(object sender, EventArgs e)
        {
            Tool = true;
            b_tool.Enabled = false;
        }

        /*****************************************************************************
                                   Backgrounds Worker 
                              -> Do_Work : Tourne en continu
                     -> ProgressChanged est appelé par "ReportProgress"
                  -> RunWorker_Completed -> Lorsque que Do_Work est terminé
        *****************************************************************************/

        //Data loading
            //Lis le fichier Xml et l'envoie dans le process
        private void bgw_loadData_DoWork(object sender, DoWorkEventArgs e)
        {
            string path = @"C:\Users\Virtual\Source\Repos\RailsSplicing\BuildProcess.xml";
            XmlSerializer serializer = new XmlSerializer(typeof(Process));
            StreamReader reader = new StreamReader(path);
            data = (Process)serializer.Deserialize(reader);
            bgw_loadData.ReportProgress(0, "Loading data - In progress");

            //Reinitialisation des registres
            for(int i = 1; i<=100; i++)
            {
                write_register(i, 0);
            }
        }

            //Gère l'Affichage sur l'IHM et dans le Fichier logs
        private void bgw_loadData_ProgressChanged(object sender, ProgressChangedEventArgs e)
        {
            // Update UI
            bgw_sequencer.ReportProgress(0, new Progress { statut = e.UserState.ToString() });

            //Affichage des informations sur les steps à affectuer
            Label[] lb = new Label[data.step.Count];
            lb[0] = l_Step1;
            lb[1] = l_Step2;
            lb[2] = l_Step3;
            lb[3] = l_Step4;
            for (int i = 0; i < data.step.Count; i++)
            {
                lb[i].Text += "Step " + (i+1) + " | C : " + data.step[i].C + " | ToolDiameter : " + data.step[i].Tool + " - " + data.step[i].stations.Count + " stations";
                lb[i].ForeColor = Color.Black;
            }
            lb_Finish.Visible = true;
            lb_Current.Visible = true;
            lb_Next.Visible = true;
        }

            //Affiche dans _logs la réussite ou non du chargement des data
        private void bgw_loadData_RunWorkerCompleted(object sender, RunWorkerCompletedEventArgs e)
        {
            if (e.Error != null)
            {
                // An error occurred
                bgw_sequencer.ReportProgress(0, new Progress { statut = "Loading data - Error : " + e.Error.Message });
            }
            else if (e.Cancelled)
            {
                // The process was cancelled
                bgw_sequencer.ReportProgress(0, new Progress { statut = "Loading data - Cancelled" });
            }
            else
            {
                // The process finished -> Possibilité de lancer le Cycle 
                bgw_sequencer.ReportProgress(0, new Progress { statut = "Loading data - Done" });
                this.b_startCycle.Enabled = true;
                this.b_loadData.Enabled = false;
            }
        }

        //Sequencer
            //Gestion du programme Roboguide - Programme principal : Envoie des R et PR dans le Controleur Robot
        private void bgw_sequencer_DoWork(object sender, DoWorkEventArgs e)
        {
            write_register(1, 1); //Installation
            bgw_sequencer.ReportProgress(0, new Progress { statut = "Sequencer - Begin of Mission" });
            wait();

            foreach (Step step in data.step)
            {
                //On prend en compte le couple lié au Step + On garde en mémoire les infos lié au Step en cours
                C = false;
                Tool = false;
                txt_step = "" + step.id;

                if (Ctype == step.C)
                    C = true;
                else 
                    Ctype = step.C;
                ToolDiam = step.Tool;

                //On met dans roboguide le UT adéquat
                if (Ctype == "Web")
                {
                    write_register(2, 1);
                }
                else if (Ctype == "Flange")
                {
                    write_register(2, 2);
                }

                //Mise en place du couple
                Setup();
                while (!C || !Tool)
                {

                }

                bgw_sequencer.ReportProgress(0, new Progress { statut = "Robot completely fitted - Start Step" });

                write_register(1, 7); //Clamp pour déplacement
                wait();
                
                bgw_robotStatus.ReportProgress(0, "Leaving Home Position");
                write_register(1, 4); //On quitte la position Home Globale pour la position déplacement 7è Axe
                wait();

                bgw_sequencer.ReportProgress(0, new Progress { statut = "Step " + step.id + " | C : " + step.C + " | ToolDiameter : " + step.Tool });
                bgw_robotStatus.ReportProgress(0, "StepBegin");

                foreach (Station station in step.stations)
                {
                    // On garde en mémoire les infos liées à la station en cours
                    numHoles = station.Points;
                    txt_station = "" + station.id; //Affichage du n° de station
                    txt_rail = "" + station.Rail;
                    txt_position = "" + station.Position;
                    txt_side = "" + station.Side;

                    //Réinitialisation pour affichage IHM
                    hole = 0;
                    HoleProgress = 0;

                    bgw_robotStatus.ReportProgress(0, "StationBegin");
                    bgw_sequencer.ReportProgress(0, new Progress { statut = "Station " + station.id + " | Rail : " + station.Rail + " " + station.Position + " " + station.Side });

                    foreach (Phase phase in station.phase)
                    {
                        //Prise en compte du mode de déplacement lié à la phase et écriture du registre de position adapté
                        bool mode = phase.Mode == "joint";
                        
                        foreach (Point point in phase.points)
                        {
                            //Phase Approach et Clearance
                            if(mode)
                            {
                                write_position_register_Joint(
                                point.id + 9,
                                point.UT,
                                point.UF,
                                point.X,
                                point.Y,
                                point.Z,
                                point.W,
                                point.P,
                                point.R,
                                point.E1);
                            }

                            //Phases de perçage
                            else
                            {
                                write_position_register(
                                 point.id + 9,
                                 point.UT,
                                 point.UF,
                                 point.X,
                                 point.Y,
                                 point.Z,
                                 point.W,
                                 point.P,
                                 point.R,
                                 point.E1,
                                 point.t4,
                                 point.t5,
                                 point.t6,
                                 point.front,
                                 point.up,
                                 point.left,
                                 point.flip);
                            }
                            
                            //Information sur le type de trajectoire
                            Int32 traj = 0;
                            if (point.type == "joint" & point.approx == "cnt")
                            {
                                traj = 1;
                            }
                            else if (point.type == "joint" & point.approx == "fine")
                            {
                                traj = 2;
                            }
                            else if (point.type == "linear" & point.approx == "cnt")
                            {
                                traj = 3;
                            }
                            else if (point.type == "linear" & point.approx == "fine")
                            {
                                traj = 4;
                            }

                            //Ecritures des infos dans les registres, max de 10 pts /phase (possibilité de modifier)
                            //Traj Type
                            write_register(point.id + 29, traj);
                            //Speed
                            write_register(point.id + 39, point.speed);
                            //CNT
                            write_register(point.id + 49, point.cnt);
                        }

                        //Number of points
                        write_register(10, phase.points.Count);

                        if (phase.Info == "Clearance")
                            write_register(3, 1); //Ferme au point n°2
                        else if (phase.Info == "Approach")
                            write_register(4, 1); //Ouvre à l'avant dernier point

                        //Affichage IHM et Logs
                        if (phase.Info != "Drill")
                        {
                            bgw_robotStatus.ReportProgress(HoleProgress, phase.Info);
                            bgw_sequencer.ReportProgress(0, new Progress { statut = phase.Info });
                        }
                        if (phase.Info == "Drill")
                            bgw_robotStatus.ReportProgress(HoleProgress, "Moving to next Point");
                        
                        //Génération de la trajectoire et déplacement du Robot selon les infos envoyées dans le séquenceur (R et PR)
                        write_register(1, 5);
                        wait();

                        //Déroulé d'une phase de perçage
                        if (phase.Info == "Drill")
                        {
                            write_register(1, 7); //Clamp
                            bgw_robotStatus.ReportProgress(HoleProgress, "Clamp"); //Affichage Action + MaJ ProgressBar
                            wait();
                            
                            write_register(1, 6); //Perce
                            bgw_robotStatus.ReportProgress(HoleProgress, "Drill");
                            wait();
                            
                            write_register(1, 8); //UnClamp
                            bgw_robotStatus.ReportProgress(HoleProgress, "UnClamp");
                            wait();
                            
                            hole++;
                            HoleProgress = (Int32)(((double)hole * 100) / ((double)numHoles));
                            bgw_robotStatus.ReportProgress(HoleProgress, "");
                            bgw_sequencer.ReportProgress(0, new Progress { statut = "Point " + (phase.id-1) + " : Fastener " + phase.FastName + " - Done" });
                        }
                    }

                    bgw_sequencer.ReportProgress(0, new Progress { statut = "End of station " + station.id });
                }

                bgw_sequencer.ReportProgress(0, new Progress { statut = "End of step " + step.id });
                bgw_robotStatus.ReportProgress(0, "StepEnd");
                write_register(1, 3); //Retour à la position Home Globale pour changement du couple
                wait();
            }
            bgw_robotStatus.ReportProgress(0, "ProcessEnd");

            write_register(1, 2); //Désinstallation -> Retour en position d'installation
            wait();
            bgw_sequencer.ReportProgress(0, new Progress { statut = "Sequencer - End Of Mission" });
        }       

        //Ecriture du fichier logs
        private void bgw_sequencer_ProgressChanged(object sender, ProgressChangedEventArgs e)
        {
            // Update UI
            var status = (Progress)e.UserState;
            logs.Add(DateTime.Now.ToString("hh:mm:ss") + " : " + status.statut);
            using(StreamWriter File = new StreamWriter(@"C:\Users\Virtual\Source\Repos\RailsSplicing\logs.txt"))
            {
                foreach (String s in logs)
                    File.WriteLine(s);
            }
        }

        //Affichage dans _logs de la réussite ou non du séquenceur
        private void bgw_sequencer_RunWorkerCompleted(object sender, RunWorkerCompletedEventArgs e)
        {
            if (e.Error != null)
            {
                // An error occurred
                bgw_sequencer.ReportProgress(0, new Progress { statut = "Sequencer - Error : " + e.Error.Message });
            }
            else if (e.Cancelled)
            {
                // The process was cancelled
                bgw_sequencer.ReportProgress(0, new Progress { statut = "Sequencer - Cancelled" });
            }
            else
            {
                // The process finished
                this.b_startCycle.Enabled = true;
            }
            System.Diagnostics.Process.Start(@"C:\Users\Virtual\Source\Repos\RailsSplicing\logs.txt");
        }

        //Robot status
        private void bgw_robotStatus_DoWork(object sender, DoWorkEventArgs e)
        {
            while(true)
            {

            }
        }

            //Affichage IHM
        private void bgw_robotStatus_ProgressChanged(object sender, ProgressChangedEventArgs e)
        {
            //Gestion de la mise en place du END EFFECTOR
            if(e.ProgressPercentage == 1)
            {
                if (!C)
                    b_C.Enabled = true;
                else if (C && !Tool)
                    b_tool.Enabled = true;
                this.tb_setup.Text = "" + e.UserState;
            }
                   
            //Gestion du début de step 
            else if(""+e.UserState == "StepBegin")
            {
                this.tb_Piercing.Clear();
                this.tb_Piercing.Text += "Step " + txt_step + " | C : " + Ctype + " | ToolDiameter : " + ToolDiam + Environment.NewLine;
                this.tb_Piercing.SelectionStart = this.tb_Piercing.Text.Length;
                this.tb_Piercing.ScrollToCaret();

                if (txt_step == "1")
                {
                    l_Step1.ForeColor = Color.DarkOrange;
                }
                else if (txt_step == "2")
                {
                    l_Step2.ForeColor = Color.DarkOrange;
                }
                else if (txt_step == "3")
                {
                    l_Step3.ForeColor = Color.DarkOrange;
                }
                else if (txt_step == "4")
                {
                    l_Step4.ForeColor = Color.DarkOrange;
                }
            }

            //Gestion de la fin d'un Step
            else if(""+e.UserState == "StepEnd")
            {
                if (txt_step == "1")
                {
                    l_Step1.ForeColor = Color.Green;
                }
                else if (txt_step == "2")
                {
                    l_Step2.ForeColor = Color.Green;
                }
                else if (txt_step == "3")
                {
                    l_Step3.ForeColor = Color.Green;
                }
                else if (txt_step == "4")
                {
                    l_Step4.ForeColor = Color.Green;
                }
                this.tb_Action.Text = "Going Home Position";
                this.tb_processStation.Clear();
                this.tb_hole.Clear();
                this.tb_processStation.Clear();
                this.tb_hole.Clear();
                this.pb_Piercing.Value = 0;
                this.l_CountHole.Text = "" + 0 + " / " + 0;
            }

            //Gestion du début de station
            else if("" + e.UserState == "StationBegin")
            {
                this.tb_processStation.Text = "Station " + txt_station + " | Rail : " + txt_rail + " " + txt_position + " " + txt_side;
                this.tb_hole.Text = "" + numHoles;
                this.pb_Piercing.Value = 0;
                this.l_CountHole.Text = "" + 0 + " / " + 0;
            }

            //Gestion de la fin du Process
            else if ("" + e.UserState == "ProcessEnd")
            {
                this.tb_Action.Clear();
                this.tb_Piercing.Clear();
                this.tb_setup.Text += "End Of Mission";
            }

            //Gestion ProgressBar pour les perçages
            else
            {
                this.tb_Action.Text = "" + e.UserState;
                this.l_CountHole.Text = "" + hole + " / " + numHoles;
                this.pb_Piercing.Value = e.ProgressPercentage;

                if (this.pb_Piercing.Value == 100 && (""+e.UserState) != "Clearance")
                {
                     if (txt_side == "")
                        this.tb_Piercing.Text += "Station " + txt_station + " | Rail : " + txt_rail + " " + txt_position + " - Succeed" + Environment.NewLine;
                     else
                        this.tb_Piercing.Text += "Station " + txt_station + " | Rail : " + txt_rail + " " + txt_position + " " + txt_side + " - Succeed" + Environment.NewLine;                   
                }
            }
               
        }

        /*****************************************************************************
                                      Fontions utiles
        *****************************************************************************/

        //Attente de la réinitialisation de la valeur du registre 1 
        private void wait()
        {
            while (read_register(1) != 0)
            {

            }
        }
        
        //Mise en Place du END EFFECTOR 
        private void Setup()
        {
            bgw_robotStatus.ReportProgress(1, "Set the C, type : " + Ctype + " on robot");
            while (!C)
            {

            }
            bgw_robotStatus.ReportProgress(1, "Set the Tool, diameter " + ToolDiam + " on C");
            while (!Tool)
            {

            }
            bgw_robotStatus.ReportProgress(1, "Robot Fitted - Running Process");
        }
    }
}
