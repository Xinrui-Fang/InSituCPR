# LLM-based In-situ Thought Exchanges for Critical Paper Reading (IUI' 26)
<img width="1431" height="806" alt="teaser_IUI26" src="https://github.com/user-attachments/assets/ccf7ffcc-5ec1-413f-9f3c-baaf412887ef" />

### [Project Page](https://xinrui.design/InSituCPR/) | [arXiv](https://arxiv.org/pdf/2510.15234)

## Authors
[Xinrui Fang](https://xinrui.design/)¹, [Anran Xu](https://anranxu.com/)¹², [Chi-Lan Yang](https://www.chilanyang.space/)¹, [Ya-Fang Lin](https://s103065533.wixsite.com/yafanglin)¹, [Sylvain Malacria](https://www.malacria.com/)¹³, [Koji Yatani](https://iis-lab.org/member/koji-yatani/)¹         

¹ The University of Tokyo  
² RIKEN Center for Advanced Intelligence Project, RIKEN  
³ Univ. Lille, Inria, CNRS, Centrale Lille, UMR 9189 CRIStAL Lille  
> **Abstract**: Critical reading is a primary way through which researchers develop their critical thinking skills. While exchanging thoughts and opinions with peers can strengthen critical reading, junior researchers often lack access to peers who can offer diverse perspectives. To address this gap, we designed an in-situ thought exchange interface informed by peer feedback from a formative study (N=8) to support junior researchers' critical paper reading. We evaluated the effects of thought exchanges under three conditions (no-agent, single-agent, and multi-agent) with 46 junior researchers over two weeks. Our results showed that incorporating agent-mediated thought exchanges during paper reading significantly improved participants' critical thinking scores compared to the no-agent condition. In the single-agent condition, participants more frequently made reflective annotations on the paper content. In the multi-agent condition, participants engaged more actively with agents' responses. Our qualitative analysis further revealed that participants compared and analyzed multiple perspectives in the multi-agent condition. This work contributes to understanding in-situ AI-based support for critical paper reading through thought exchanges and offers design implications for future research.

## How to start
### Start with Docker
```docker
docker compose build
docker compose up -d
Visit http://localhost
```

### Start Manually
Start Frontend
```javascript
cd frontend
npm install
npm run dev
Visit http://localhost:3000 
```

Start Backend
```python
cd backend
python install -r requirements.txt
python server.py
```
For reference feature, enter your semantic scholar API key into /backend/.env

### Citations
```
@inproceedings{Fang2026InSituThoughtExchanges,
  author    = {Fang, Xinrui and Xu, Anran and Yang, Chi-Lan and Lin, Ya-Fang and Malacria, Sylvain and Yatani, Koji},
  title     = {LLM-based In-situ Thought Exchanges for Critical Paper Reading},
  booktitle = {Proceedings of the 31st International Conference on Intelligent User Interfaces},
  series    = {IUI '26},
  year      = {2026},
  pages     = {1--22},
  address   = {New York, NY, USA},
  publisher = {ACM},
  doi       = {10.1145/3742413.3789069},
  url       = {https://doi.org/10.1145/3742413.3789069}
}
```
