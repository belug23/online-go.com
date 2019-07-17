/*
 * Copyright (C) 2012-2017  Online-Go.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from "react";
import { _, pgettext, interpolate } from "translate";

import * as player_cache from "player_cache";
import { tickStep } from "d3";
import { triggerAsyncId } from "async_hooks";

interface JosekiVariationFilterProps {
    godojo_headers: any;
    contributor_list_url: string;
    tag_list_url: string;
    source_list_url: string;
    set_variation_filter: any;
    current_filter: {contributor: number, tag: number, source: number};
}

export class JosekiVariationFilter extends React.PureComponent<JosekiVariationFilterProps, any> {
    constructor(props) {
        super(props);
        this.state = {
            contributor_list: [],
            tag_list: [],
            source_list: [],
            selected_filter: {
                tag: this.props.current_filter['tag'],
                contributor: this.props.current_filter['contributor'],
                source: this.props.current_filter['source']
            }
        };
    }

    componentDidMount = () => {
        // Get the list of contributors to chose from
        fetch(this.props.contributor_list_url, {
            mode: 'cors',
            headers: this.props.godojo_headers
        })
        .then(res => res.json())
        .then(body => {
            console.log("Server response to contributors GET:", body);
            let contributor_list = [];
            body.forEach((id, idx) => {
                console.log("Looking up player", id, idx);
                const player = player_cache.lookup(id);
                contributor_list[idx] = {resolved: player !== null, player: player === null ? id : player};

                if (player === null) {
                    console.log("fetching player", id, idx);
                    player_cache.fetch(id).then((p) => {
                        console.log("fetched player", p, id, idx); // by some javascript miracle this is the correct value of idx
                        let contributor_list = [...this.state.contributor_list];
                        contributor_list[idx] = {resolved: true, player: p};
                        this.setState({contributor_list});
                    }).catch((r) => {
                        console.log("Player cache fetch failed:", r);
                    });
                }
            });
            this.setState({contributor_list});
        }).catch((r) => {
            console.log("Contributors GET failed:", r);
        });

        fetch(this.props.tag_list_url, {
            mode: 'cors',
            headers: this.props.godojo_headers
        })
        .then(res => res.json())
        .then(body => {
            console.log("Server response to tag GET:", body);
            this.setState({tag_list: body.tags});
        }).catch((r) => {
            console.log("Tags GET failed:", r);
        });

        fetch(this.props.source_list_url, {
            mode: 'cors',
            headers: this.props.godojo_headers
        })
        .then(res => res.json())
        .then(body => {
            console.log("Server response to source GET:", body);
            this.setState({source_list: body.sources});
        }).catch((r) => {
            console.log("Sources GET failed:", r);
        });
    }

    onTagChange = (e) => {
        const val = e.target.value === 'none' ? null : parseInt(e.target.value);

        let new_filter;

        if (val === null) {
            // There has to be at least one tag filtered - or no filters at all.
            new_filter = {tag: null, contributor: null, source: null};
        }
        else {
            new_filter = {...this.state.selected_filter, tag: val};
        }

        console.log("new tag filter", new_filter);
        this.props.set_variation_filter(new_filter);
        this.setState({selected_filter: new_filter});
    }

    onContributorChange = (e) => {
        if (this.state.selected_filter.tag === null) {
            return;
        }
        const val = e.target.value === 'none' ? null : parseInt(e.target.value);
        const new_filter = {...this.state.selected_filter, contributor: val};
        this.props.set_variation_filter(new_filter);
        this.setState({selected_filter: new_filter});
    }

    onSourceChange = (e) => {
        if (this.state.selected_filter.tag === null) {
            return;
        }
        const val = e.target.value === 'none' ? null : parseInt(e.target.value);
        const new_filter = {...this.state.selected_filter, source: val};
        this.props.set_variation_filter(new_filter);
        this.setState({selected_filter: new_filter});
    }

    render() {
        console.log("Variation filter render");
        console.log("tags", this.state.tag_list);
        console.log("contributors", this.state.contributor_list);
        console.log("sources", this.state.source_list);

        let contributors = this.state.contributor_list.map((c, i) => {
            if (c.resolved) {
                return <option key={i} value={c.player.id}>{c.player.username}</option>;
            }
            else {
                return <option key={i} value={c.player}>{"(player " + c.player + ")"}</option>;
            }
        });

        contributors.unshift(<option key={-1} value={'none'}>({_("none")})</option>);

        let tags = this.state.tag_list.map((t, i) => (<option key={i} value={t.id}>{t.description}</option>));
        tags.unshift(<option key={-1} value={'none'}>({_("none")})</option>);

        let sources = this.state.source_list.map((s, i) => (<option key={i} value={s.id}>{s.description}</option>));
        sources.unshift(<option key={-1} value={'none'}>({_("none")})</option>);

        const current_contributor = (this.state.selected_filter.contributor === null) ?
             'none' :this.state.selected_filter.contributor;
        const current_tag = (this.state.selected_filter.tag === null) ?
             'none' :this.state.selected_filter.tag;
        const current_source = (this.state.selected_filter.source === null) ?
             'none' :this.state.selected_filter.source;

        return (
            <div className="joseki-variation-filter">
                <div className="filter-set">
                    <div className="filter-label">Filter by Tag</div>
                    <select value={current_tag} onChange={this.onTagChange}>
                                {tags}
                    </select>
                </div>

                <div className="filter-set">
                    <div className="filter-label">Filter by Contributor</div>
                    <select value={current_contributor} onChange={this.onContributorChange}
                            className={(this.state.selected_filter.tag === null ? " filter-set-inactive" : "")}
                            disabled={(this.state.selected_filter.tag === null)}>
                                {contributors}
                    </select>
                </div>

                <div className={"filter-set" + (this.state.selected_filter.tag === null ? " filter-set-inactive" : "")}>
                    <div className="filter-label">Filter by Source</div>
                    <select value={current_source} onChange={this.onSourceChange}
                            className={(this.state.selected_filter.tag === null ? " filter-set-inactive" : "")}
                            disabled={(this.state.selected_filter.tag === null)}>
                                {sources}
                    </select>
                </div>

                <div className="filter-notes">
                    {(this.state.selected_filter.tag === null ? " (Select a Tag to filter first)" : "")}
                </div>
            </div>
        );
    }


}
