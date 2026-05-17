# Renova_te_ipsum: SF-ORB Synthetic Cognitive Framework

SF-ORB (Synthetic Framework - Orb Reasoning Brain) is an advanced synthetic cognitive framework implementing multi-modal reasoning with immutable Doctrine v1.0 governance. It synthesizes philosophical traditions (Spinoza, Hume, Locke, Kant) with modern computational approaches including Bayesian inference, geometric reasoning, and cryptographic provenance.

**Status**: Active Development - Governance integration in progress

## Validation Doctrine

*"Validation observes truth; it never creates, modifies, or suppresses it."*

This principle governs the final validation layer: three frozen observational witnesses (deductive, inductive, intuitive) that document system beliefs at delivery time without ever altering verdicts. The validation layer provides tamper-evident provenance while maintaining absolute non-interference with core reasoning.

## Core Philosophy

The system embodies a "Triple Triple Architecture" (Triad C) that synthesizes three epistemic domains:
- **Deductive Logic**: Sovereign guard rails ensuring logical consistency
- **Inductive Logic**: Habit formation through Humean constant conjunctions
- **Intuitive Logic**: Spinozan necessity recognition for emergent insights

## System Architecture

### Core Components

#### 1. Four Minds Tribunal
Located in `core_4_minds/`, this module implements philosophical mind models:
- **Spinoza (Monism)**: Substance unity and necessity recognition
- **Hume (Skepticism)**: Habit tracking and vivacity of impressions
- **Locke (Empiricism)**: Sensory data processing and empiric validation
- **Kant (Critical)**: Categorical imperative and synthetic a priori reasoning

#### 2. Bayesian Engine (`bayesian_engine.py`)
Probabilistic inference engine that:
- Maintains priors for cognitive modes (Guard/Habit/Intuition)
- Updates beliefs based on stimulus patterns
- Provides confidence scores for decision-making

#### 3. HLSF Geometry Engine (`hlsf_geometry/`)
High-Level Spatial Field geometry for:
- Spatial reasoning and coordinate mapping
- Field density management with edge-cutting algorithms
- Bilateral symmetry detection for intuitive jumps

#### 4. Vault System (`vault_system/`)
Knowledge storage and retrieval:
- **Apriori Vault**: Innate logic seeds and constraints
- **Posteriori Vault**: Learned patterns and cached inferences
- Persistent storage with temporal decay

#### 5. Orb Controller (`orb_controller.py`)
The central orchestrator featuring:
- **HabitTracker**: Records and predicts cursor movement patterns
- **IntuitiveRecognizer**: Detects high-density fields and symmetry for jumps
- **CrossDomainPredicate**: Emergent thought synthesis across domains

### Cognitive Modes

The system operates in three primary modes:
- **Guard Mode**: Default deductive reasoning, ensures safety and consistency
- **Habit Mode**: Inductive learning from repeated patterns
- **Intuition-Jump Mode**: Emergent insights triggered by field density and symmetry

## Governance Doctrine v1.0

The SF-ORB framework implements immutable governance principles for AI safety and truth validation:

### Core Pipeline
```
RAW REALITY → [Kant→Locke→Hume→Spinoza→Harmonizer→CALI] → DecisionEnvelope → Response
                           ↑                                        ↑ ActionRecords
                    Observer/Auditor ───────────────────────────────┘
                           ↑
                Infra Auditor + Doctrine Drift Indicator (DDR)
```

### Key Principles
- **Raw Input Contract**: No preprocessing before epistemic lenses
- **Lens Independence**: Each philosophical lens operates autonomously  
- **Dialectical Tension**: Structured disagreement forces truth convergence
- **Immutable Records**: All decisions cryptographically bound and auditable
- **Article VIII Override**: Explicit override ID required for any deviation

### Trust States
- `RAW`: Initial input received
- `EPISTEMIC`: Lens verdicts generated
- `HARMONIZED`: Tension resolved via dialectic
- `ARTICULATED`: CALI truth assessment
- `SEALED`: Envelope cryptographically bound
- `EXECUTED`: Response delivered with provenance

### Alert Levels
- **HEALTHY**: DDR > 0.8 (lenses independent)
- **CAUTION**: DDR 0.5-0.8 (emerging correlation)
- **CRITICAL**: DDR < 0.5 (lens monoculture detected)

## Project Structure

```
Renova_te_ipsum/
├── README.md                       # This documentation
├── requirements.txt                # Python dependencies
├── tree.txt                        # Directory tree snapshot
├── bayesian_engine.py              # Core Bayesian inference engine
├── orb_controller.py               # Main cognitive synthesis controller (IN DEVELOPMENT)
├── sf_orb_Governance.py            # Governance framework integration
├── core_4_minds/                   # Philosophical mind models
│   └── tribunal.py                 # Four minds coordination
├── hlsf_geometry/                  # Spatial reasoning engine
│   └── engine.py                   # HLSF geometry core
├── interface/                      # User interface components
├── logic_seeds/                    # Logic configuration files
├── vault_system/                   # Knowledge management
│   └── manager.py                  # Vault operations
├── vaults/                         # Additional vault storage
└── results/                        # Test output storage
```

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Spruked/Renova_te_ipsum.git
   cd Renova_te_ipsum
   ```

2. **Create virtual environment** (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Requirements

- Python 3.8 or higher
- Cross-platform support (Linux, macOS, Windows)
- Dependencies: numpy, PySide6 (for visualization)

## Usage

### Current Status

**IN DEVELOPMENT**: The SF-ORB cognitive framework is currently under active development. Key components include:

- ✅ **Bayesian Engine**: Probabilistic inference for cognitive modes
- ✅ **HLSF Geometry**: Spatial reasoning and field density management  
- ✅ **Vault System**: Knowledge storage and retrieval
- ✅ **Four Minds Tribunal**: Philosophical coordination framework
- 🚧 **Orb Controller**: Main orchestrator (governance integration in progress)
- 🚧 **Intuitive Recognizer**: Symmetry detection (method incomplete)

### Governance Integration

All LLM integrations in the broader system now require Doctrine v1.0 governance wrapper compliance. The framework includes:

- **Epistemic Lenses**: Kant, Locke, Hume, Spinoza analysis
- **Harmonizer**: Dialectical tension resolution
- **CALI Articulator**: Truth articulation without override
- **DDR Monitor**: Doctrine drift detection
- **Observer Auditor**: External immune system

### Basic Operation (When Complete)

```python
from orb_controller import SF_ORB_Controller

# Initialize the cognitive system
controller = SF_ORB_Controller()

# Process a stimulus with governance
stimulus = {
    "type": "cursor_movement", 
    "coordinates": [960, 540],
    "velocity": 10.0,
    "intent": "navigation"
}

# Generate governed cognitive response
envelope = controller.cognitively_emerge(stimulus)
print(envelope.orb_response)  # Governed cognitive output
```
```

### Running Tests

Automated test suites are under development. Current test results are stored in the `results/` directory as CSV files from manual testing sessions.

For manual testing:

1. Initialize the controller
2. Send various stimuli (cursor movements, etc.)
3. Observe mode transitions and response times
4. Results are logged to `results/cognitive_test_results_*.csv`

### Ethical Dilemma Testing

Ethical reasoning is a conceptual extension of the framework. To implement moral dilemmas:

1. Define custom logic seeds in `logic_seeds/` for moral constraints
2. Create dilemma stimuli with moral implications
3. Observe how the system switches modes based on configured ethics
4. Note: Full ethical AI implementation requires additional development

Example conceptual dilemma stimulus:
```python
ethical_stimulus = {
    "type": "moral_dilemma",
    "scenario": "trolley_problem",
    "options": ["switch_track", "do_nothing"],
    "consequences": {
        "switch_track": {"lives_saved": 5, "lives_lost": 1},
        "do_nothing": {"lives_saved": 1, "lives_lost": 5}
    }
}
# Note: This requires custom logic seeds for actual moral reasoning
```

## Testing

### Test Scenarios

The cognitive test suite includes:
- **Test 1**: Linear Drift - Steady movement for habit building
- **Test 2**: Oscillatory - Periodic patterns for predictive learning
- **Test 3**: Random Walk - Unpredictable input for guard mode dominance
- **Test 4**: Quadrant Loop - Repetitive cycles for maximum habit prediction
- **Test 5**: Symmetric Jumps - Abrupt changes with symmetry for intuition triggers

### Metrics Captured

- Mode frequencies (Guard/Habit/Intuition)
- Bypass hit rates (apriori/posteriori lightning)
- Habit signals (predictions, confidence, Hume vivacity)
- Intuition signals (jump vectors, Spinozan certainty)
- Processing latency per stimulus

## Configuration

### Logic Seeds

Customize reasoning behavior by configuring logic seeds in `logic_seeds/` subdirectories:
- `deductive_SKG/`: Deductive sovereign knowledge graphs
- `inductive_skg/`: Inductive pattern knowledge graphs
- `intuitive_skg/`: Intuitive recognition knowledge graphs
- `*_validator/`: Validation logic for each domain

### Bayesian Priors

Adjust priors in `bayesian_engine.py`:
```python
self.bayes = BayesianEngine(alpha=1.5, beta=1.0)  # alpha: guard mode prior strength, beta: habit mode prior strength
```

## Troubleshooting

### GUI Issues
- **PySide6 not found**: Ensure PySide6 is installed (`pip install PySide6`). On some Linux distributions, you may need to install system packages (e.g., `sudo apt install python3-pyside2` or similar).
- **Window not appearing**: Check that your desktop environment supports transparent windows. On some systems, you may need to disable window decorations.
- **Performance issues**: The orb visualization runs at 60fps; reduce update rates in `orb_window.py` if needed.

### Import Errors
- Ensure you're running from the project root directory.
- Check that all dependencies are installed.
- For development, you may need to add the project path to PYTHONPATH.

### Cognitive Processing
- If no mode switching occurs, check that stimuli are varied enough (different velocities, coordinates).
- Results are logged to `results/`; check CSV files for processing data.

## Contributing

1. Document changes and rationale in project notes
2. Test new features manually and verify results in `results/`
3. Follow the Triple Triple Architecture principles
4. Ensure ethical considerations in cognitive extensions
5. Update README.md for any structural changes

## License

MIT License - see LICENSE file for details.

---

*Built with philosophical rigor and computational elegance. Last updated: May 3, 2026*